import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '@/lib/solana/anchorSetup';
import { getChatRoomPDA } from '@/lib/solana/pdaHelpers';

/**
 * useRealtimeChatWebSocket Hook
 * 使用智能轮询实时监听好友聊天消息（优化版）
 */
export function useRealtimeChatWebSocket(friendAddress) {
    const { publicKey, connected } = useWallet();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // 加载消息（客户端直接调用，带本地缓存）
    const loadMessages = useCallback(async () => {
        if (!publicKey || !connected || !friendAddress) return;

        setIsLoading(true);
        try {
            const program = getProgram({ publicKey });
            const friendPubkey = new PublicKey(friendAddress);
            const [chatRoomPDA] = getChatRoomPDA(publicKey, friendPubkey);

            const chatRoom = await program.account.chatRoom.fetchNullable(chatRoomPDA);
            if (!chatRoom) {
                setMessages([]);
                return;
            }

            const allMessages = await program.account.message.all([
                {
                    memcmp: {
                        offset: 8,
                        bytes: chatRoomPDA.toBase58(),
                    },
                },
            ]);

            const formattedMessages = allMessages
                .map(m => {
                    const content = m.account.content;
                    const sender = m.account.sender.toString();
                    const isMine = sender === publicKey.toString();

                    if (content.startsWith('PAYMENT_REQUEST:')) {
                        const [, amount, requester] = content.split(':');
                        return {
                            id: m.publicKey.toString(),
                            content: `💰 Payment Request\n\nRequesting ${amount} SOL`,
                            sender,
                            timestamp: new Date(m.account.timestamp.toNumber() * 1000).toISOString(),
                            isMine,
                            isPaymentRequest: !isMine,
                            paymentRequestData: { amount, requester },
                        };
                    }

                    if (content.startsWith('TRANSFER_SUCCESS:')) {
                        const [, amount, signature] = content.split(':');
                        return {
                            id: m.publicKey.toString(),
                            content: `✅ Transfer successful!\n\n${amount} SOL received\n\nTransaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
                            sender,
                            timestamp: new Date(m.account.timestamp.toNumber() * 1000).toISOString(),
                            isMine,
                            explorerLink: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
                        };
                    }

                    return {
                        id: m.publicKey.toString(),
                        content,
                        sender,
                        timestamp: new Date(m.account.timestamp.toNumber() * 1000).toISOString(),
                        isMine,
                    };
                })
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            setMessages(formattedMessages);
            console.log(`✅ Messages loaded: ${formattedMessages.length} messages`);
        } catch (err) {
            console.error('Error loading messages:', err);
            setMessages([]);
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, connected, friendAddress]);

    // 使用智能轮询（优化版）
    useEffect(() => {
        if (!publicKey || !connected || !friendAddress) return;

        // 初始加载
        loadMessages();

        // 智能轮询配置（使用 API 后可以更频繁）
        const POLLING_INTERVAL = 5000; // 5 秒（API 有缓存，可以更快）
        let intervalId = null;

        const startPolling = () => {
            if (intervalId) return;

            intervalId = setInterval(() => {
                // 只在页面可见时轮询
                if (document.visibilityState === 'visible') {
                    console.log('🔄 Polling for new messages...');
                    loadMessages();
                }
            }, POLLING_INTERVAL);

            console.log('📡 Chat polling started (every 5s, only when visible)');
        };

        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
                console.log('⏸️ Chat polling paused');
            }
        };

        // 监听页面可见性变化
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ Page visible, resuming polling');
                loadMessages(); // 立即加载
                startPolling();
            } else {
                console.log('🙈 Page hidden, pausing polling');
                stopPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        startPolling();

        // 清理函数
        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [publicKey, connected, friendAddress, loadMessages]);

    // 手动刷新函数
    const refresh = useCallback(() => {
        loadMessages();
    }, [loadMessages]);

    return {
        messages,
        isLoading,
        refresh,
    };
}

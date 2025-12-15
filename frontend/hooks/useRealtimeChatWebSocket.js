import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '@/lib/solana/anchorSetup';
import { getChatRoomPDA } from '@/lib/solana/pdaHelpers';
import { useIdleDetection } from './useIdleDetection';

// 未读消息管理
export const setUnreadChat = (friendAddress, hasUnread) => {
    if (typeof window === 'undefined') return;
    try {
        const unread = JSON.parse(localStorage.getItem('unread_chats') || '{}');
        if (hasUnread) {
            unread[friendAddress] = true;
        } else {
            delete unread[friendAddress];
        }
        localStorage.setItem('unread_chats', JSON.stringify(unread));
        // 触发 storage 事件让其他组件更新
        window.dispatchEvent(new Event('storage'));
    } catch (e) {
        console.error('Error updating unread status:', e);
    }
};

/**
 * useRealtimeChatWebSocket Hook
 * 使用智能轮询实时监听好友聊天消息（优化版 + 空闲检测）
 */
export function useRealtimeChatWebSocket(friendAddress) {
    const { publicKey, connected } = useWallet();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { isIdle, resetActivity } = useIdleDetection(60000); // 60秒空闲
    const lastMessageCountRef = useRef(0);

    // 加载消息（客户端直接调用，带本地缓存）
    const loadMessages = useCallback(async (showLoading = false) => {
        if (!publicKey || !connected || !friendAddress) return;

        // 只在初始加载或手动刷新时显示 loading
        if (showLoading) {
            setIsLoading(true);
        }
        const startTime = Date.now();

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

            // 检测是否有新消息（来自对方）
            const newMessageCount = formattedMessages.length;
            if (newMessageCount > lastMessageCountRef.current && lastMessageCountRef.current > 0) {
                // 检查最新消息是否来自对方
                const latestMsg = formattedMessages[formattedMessages.length - 1];
                if (latestMsg && !latestMsg.isMine) {
                    // 设置未读状态
                    setUnreadChat(friendAddress, true);
                }
            }
            lastMessageCountRef.current = newMessageCount;

            setMessages(formattedMessages);
            console.log(`✅ Messages loaded: ${formattedMessages.length} messages`);
        } catch (err) {
            console.error('Error loading messages:', err);
            setMessages([]);
        } finally {
            // 只在显示了 loading 时才需要隐藏
            if (showLoading) {
                // 确保 loading 至少显示 300ms，让用户看到
                const elapsed = Date.now() - startTime;
                const minLoadingTime = 300;
                if (elapsed < minLoadingTime) {
                    setTimeout(() => setIsLoading(false), minLoadingTime - elapsed);
                } else {
                    setIsLoading(false);
                }
            }
        }
    }, [publicKey, connected, friendAddress]);

    // 使用智能轮询（优化版）
    useEffect(() => {
        if (!publicKey || !connected || !friendAddress) return;

        // 初始加载（显示 loading）
        loadMessages(true);

        // 智能轮询配置（使用 API 后可以更频繁）
        const POLLING_INTERVAL = 5000; // 5 秒（API 有缓存，可以更快）
        let intervalId = null;

        const startPolling = () => {
            if (intervalId) return;

            intervalId = setInterval(() => {
                // 只在页面可见且用户活跃时轮询
                if (document.visibilityState === 'visible' && !isIdle) {
                    console.log('🔄 Polling for new messages...');
                    loadMessages(false); // 轮询时不显示 loading
                } else if (isIdle) {
                    console.log('😴 User idle, skipping poll');
                }
            }, POLLING_INTERVAL);

            console.log('📡 Chat polling started (every 5s, only when visible and active)');
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
                loadMessages(false); // 立即加载，但不显示 loading
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
    }, [publicKey, connected, friendAddress, loadMessages, isIdle]);

    // 手动刷新函数（同时重置空闲状态）
    const refresh = useCallback(() => {
        resetActivity(); // 重置空闲状态
        loadMessages(false); // 手动刷新不显示 loading（已经有刷新按钮了）
    }, [loadMessages, resetActivity]);

    return {
        messages,
        isLoading,
        refresh,
        isIdle, // 返回空闲状态
        resetActivity, // 返回重置函数
    };
}

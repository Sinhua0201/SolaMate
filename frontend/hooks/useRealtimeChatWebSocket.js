import { useEffect, useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '@/lib/solana/anchorSetup';
import { getChatRoomPDA } from '@/lib/solana/pdaHelpers';

/**
 * useRealtimeChatWebSocket Hook
 * 使用 Solana WebSocket 实时监听好友聊天消息
 */
export function useRealtimeChatWebSocket(friendAddress) {
    const { publicKey, connected } = useWallet();
    const { connection } = useConnection();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // 加载消息
    const loadMessages = useCallback(async () => {
        if (!publicKey || !connected || !friendAddress) return;

        setIsLoading(true);
        try {
            const program = getProgram({ publicKey });
            const friendPubkey = new PublicKey(friendAddress);
            const [chatRoomPDA] = getChatRoomPDA(publicKey, friendPubkey);

            // 检查聊天室是否存在
            const chatRoom = await program.account.chatRoom.fetchNullable(chatRoomPDA);
            if (!chatRoom) {
                setMessages([]);
                return;
            }

            // 获取所有消息
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

                    // 检查是否是 Payment Request
                    if (content.startsWith('PAYMENT_REQUEST:')) {
                        const [, amount, requester] = content.split(':');
                        return {
                            id: m.publicKey.toString(),
                            content: `💰 Payment Request\n\nRequesting ${amount} SOL`,
                            sender,
                            timestamp: new Date(m.account.timestamp.toNumber() * 1000).toISOString(),
                            isMine,
                            isPaymentRequest: !isMine,
                            paymentRequestData: {
                                amount,
                                requester,
                            },
                        };
                    }

                    // 检查是否是转账成功通知
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

    // 设置 WebSocket 订阅
    useEffect(() => {
        if (!publicKey || !connected || !friendAddress) return;

        let subId = null;

        // 初始加载
        loadMessages();

        const setupWebSocketSubscription = async () => {
            try {
                const program = getProgram({ publicKey });
                const friendPubkey = new PublicKey(friendAddress);
                const [chatRoomPDA] = getChatRoomPDA(publicKey, friendPubkey);

                // 订阅聊天室的消息账户变化
                subId = connection.onProgramAccountChange(
                    program.programId,
                    () => {
                        console.log('🔔 New message received, reloading...');
                        loadMessages();
                    },
                    'confirmed',
                    [
                        {
                            memcmp: {
                                offset: 8,
                                bytes: chatRoomPDA.toBase58(),
                            },
                        },
                    ]
                );

                console.log('📡 Chat WebSocket subscription started:', subId);
            } catch (err) {
                console.error('Error setting up WebSocket subscription:', err);
            }
        };

        setupWebSocketSubscription();

        // 清理函数
        return () => {
            if (subId !== null) {
                try {
                    connection.removeProgramAccountChangeListener(subId);
                    console.log('🔌 Chat WebSocket subscription removed:', subId);
                } catch (err) {
                    console.error('Error removing subscription:', err);
                }
            }
        };
    }, [publicKey, connected, friendAddress, connection, loadMessages]);

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

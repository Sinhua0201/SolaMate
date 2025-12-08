import { useEffect, useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '@/lib/solana/anchorSetup';

/**
 * useRealtimeFriendsWebSocket Hook
 * 使用 Solana WebSocket 实时监听好友变化
 */
export function useRealtimeFriendsWebSocket() {
    const { publicKey, connected } = useWallet();
    const { connection } = useConnection();
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // 加载好友列表
    const loadFriends = useCallback(async () => {
        if (!publicKey || !connected) return;

        setIsLoading(true);
        try {
            const program = getProgram({ publicKey });

            // 获取所有好友关系（添加错误处理）
            let friendships = [];
            try {
                friendships = await program.account.friendship.all();
            } catch (err) {
                if (err.message && err.message.includes('429')) {
                    console.warn('⚠️ Rate limited, skipping friends update');
                    setIsLoading(false);
                    return;
                }
                throw err;
            }

            const acceptedFriends = [];
            const pending = [];

            for (const friendship of friendships) {
                const { userA, userB, status } = friendship.account;
                const isUserA = userA.toString() === publicKey.toString();
                const isUserB = userB.toString() === publicKey.toString();

                if (!isUserA && !isUserB) continue;

                const friendAddr = isUserA ? userB.toString() : userA.toString();

                // 获取好友资料
                let friendProfile = null;
                try {
                    const response = await fetch(`/api/profile?walletAddress=${friendAddr}`);
                    const data = await response.json();
                    if (data.success && data.exists) {
                        friendProfile = {
                            address: friendAddr,
                            username: data.profile.username,
                            displayName: data.profile.displayName,
                        };
                    }
                } catch (err) {
                    console.error('Error fetching friend profile:', err);
                }

                if (status.accepted) {
                    if (friendProfile) {
                        acceptedFriends.push(friendProfile);
                    }
                } else if (status.pending) {
                    // 检查是否是收到的请求
                    const requester = friendship.account.requester;
                    const isReceived = requester.toString() !== publicKey.toString();

                    if (isReceived && friendProfile) {
                        pending.push(friendProfile);
                    }
                }
            }

            setFriends(acceptedFriends);
            setPendingRequests(pending);

            console.log(`✅ Friends loaded: ${acceptedFriends.length} friends, ${pending.length} pending`);
        } catch (err) {
            console.error('Error loading friends:', err);
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, connected]);

    // 设置 WebSocket 订阅
    useEffect(() => {
        if (!publicKey || !connected) return;

        let subscriptionId = null;

        // 初始加载
        loadFriends();

        const setupWebSocketSubscription = async () => {
            try {
                const program = getProgram({ publicKey });

                // 订阅程序账户变化
                subscriptionId = connection.onProgramAccountChange(
                    program.programId,
                    () => {
                        console.log('🔔 Program account changed, reloading friends...');
                        loadFriends();
                    },
                    'confirmed',
                    [
                        {
                            memcmp: {
                                offset: 8,
                                bytes: publicKey.toBase58(),
                            },
                        },
                    ]
                );

                console.log('📡 WebSocket subscription started:', subscriptionId);
            } catch (err) {
                console.error('Error setting up WebSocket subscription:', err);
            }
        };

        setupWebSocketSubscription();

        // 清理函数
        return () => {
            if (subscriptionId !== null) {
                try {
                    connection.removeProgramAccountChangeListener(subscriptionId);
                    console.log('🔌 WebSocket subscription removed:', subscriptionId);
                } catch (err) {
                    console.error('Error removing subscription:', err);
                }
            }
        };
    }, [publicKey, connected, connection, loadFriends]);

    // 手动刷新函数
    const refresh = useCallback(() => {
        loadFriends();
    }, [loadFriends]);

    return {
        friends,
        pendingRequests,
        isLoading,
        refresh,
    };
}

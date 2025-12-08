import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '@/lib/solana/anchorSetup';

// 全局缓存，在所有组件间共享
let globalFriendsCache = null;
let globalCacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 秒缓存

/**
 * 共享的好友数据 hook
 * 使用全局缓存避免重复请求
 */
export function useFriendsCache() {
    const { publicKey, connected } = useWallet();
    const [friends, setFriends] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const loadingRef = useRef(false);

    const loadFriends = useCallback(async (forceRefresh = false) => {
        if (!publicKey || !connected) return;

        // 检查缓存
        const now = Date.now();
        if (!forceRefresh && globalFriendsCache && (now - globalCacheTimestamp) < CACHE_DURATION) {
            console.log('✅ Using cached friends data');
            setFriends(globalFriendsCache);
            return;
        }

        // 防止并发请求
        if (loadingRef.current) {
            console.log('⏳ Already loading friends, skipping...');
            return;
        }

        loadingRef.current = true;
        setIsLoading(true);

        try {
            const program = getProgram({ publicKey });

            // 获取所有好友关系
            let friendships = [];
            try {
                friendships = await program.account.friendship.all();
            } catch (err) {
                if (err.message && err.message.includes('429')) {
                    console.warn('⚠️ Rate limited, using cached data or empty');
                    setIsLoading(false);
                    loadingRef.current = false;
                    return;
                }
                throw err;
            }

            const acceptedFriends = [];
            const pendingRequests = [];

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
                    const requester = friendship.account.requester;
                    const isReceived = requester.toString() !== publicKey.toString();

                    if (isReceived && friendProfile) {
                        pendingRequests.push(friendProfile);
                    }
                }
            }

            // 更新全局缓存
            globalFriendsCache = acceptedFriends;
            globalCacheTimestamp = Date.now();

            setFriends(acceptedFriends);
            console.log(`✅ Friends loaded: ${acceptedFriends.length} friends`);
        } catch (err) {
            console.error('Error loading friends:', err);
        } finally {
            setIsLoading(false);
            loadingRef.current = false;
        }
    }, [publicKey, connected]);

    useEffect(() => {
        if (connected && publicKey) {
            loadFriends();
        }
    }, [connected, publicKey, loadFriends]);

    const refresh = useCallback(() => {
        loadFriends(true);
    }, [loadFriends]);

    return {
        friends,
        isLoading,
        refresh,
    };
}

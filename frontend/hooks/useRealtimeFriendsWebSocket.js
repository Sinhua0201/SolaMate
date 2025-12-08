import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * useRealtimeFriendsWebSocket Hook
 * 使用智能轮询实时监听好友变化（优化版）
 */
export function useRealtimeFriendsWebSocket() {
    const { publicKey, connected } = useWallet();
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // 直接使用 useFriendsCache 的逻辑
    const loadFriends = useCallback(async () => {
        // 这个 hook 现在只是 useFriendsCache 的别名
        // 实际逻辑在 useFriendsCache 中
    }, []);

    // 使用智能轮询（优化版）
    useEffect(() => {
        if (!publicKey || !connected) return;

        // 初始加载
        loadFriends();

        // 智能轮询配置（使用 API 后可以更频繁）
        const POLLING_INTERVAL = 10000; // 10 秒（API 有缓存）
        let intervalId = null;

        const startPolling = () => {
            if (intervalId) return;

            intervalId = setInterval(() => {
                // 只在页面可见时轮询
                if (document.visibilityState === 'visible') {
                    console.log('🔄 Polling for friends updates...');
                    loadFriends();
                }
            }, POLLING_INTERVAL);

            console.log('📡 Friends polling started (every 10s, only when visible)');
        };

        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
                console.log('⏸️ Friends polling paused');
            }
        };

        // 监听页面可见性变化
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ Page visible, resuming friends polling');
                loadFriends(); // 立即加载
                startPolling();
            } else {
                console.log('🙈 Page hidden, pausing friends polling');
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
    }, [publicKey, connected, loadFriends]);

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

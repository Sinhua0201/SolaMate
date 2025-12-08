import { useState, useEffect, useCallback } from 'react';

/**
 * useIdleDetection Hook
 * 检测用户是否空闲（1分钟无活动）
 * 空闲时暂停轮询，显示刷新按钮
 */
export function useIdleDetection(idleTimeout = 60000) { // 默认 60 秒
    const [isIdle, setIsIdle] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // 重置活动时间
    const resetActivity = useCallback(() => {
        setLastActivity(Date.now());
        setIsIdle(false);
    }, []);

    useEffect(() => {
        // 监听用户活动
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
        ];

        // 节流：避免过于频繁地更新
        let throttleTimer = null;
        const handleActivity = () => {
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    resetActivity();
                    throttleTimer = null;
                }, 1000); // 1秒内只触发一次
            }
        };

        // 添加事件监听
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // 检查是否空闲
        const checkIdle = setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > idleTimeout) {
                setIsIdle(true);
            }
        }, 5000); // 每5秒检查一次

        // 清理
        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            clearInterval(checkIdle);
            if (throttleTimer) {
                clearTimeout(throttleTimer);
            }
        };
    }, [lastActivity, idleTimeout, resetActivity]);

    return {
        isIdle,
        resetActivity,
    };
}

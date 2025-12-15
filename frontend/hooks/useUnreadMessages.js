import { useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '@/lib/solana/anchorSetup';
import { getChatRoomPDA } from '@/lib/solana/pdaHelpers';

// 存储每个好友的最后已读消息数量
const getLastReadCounts = () => {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem('last_read_counts') || '{}');
    } catch {
        return {};
    }
};

const setLastReadCount = (friendAddress, count) => {
    if (typeof window === 'undefined') return;
    try {
        const counts = getLastReadCounts();
        counts[friendAddress] = count;
        localStorage.setItem('last_read_counts', JSON.stringify(counts));
    } catch (e) {
        console.error('Error saving last read count:', e);
    }
};

// 设置未读状态
const setUnreadStatus = (friendAddress, hasUnread) => {
    if (typeof window === 'undefined') return;
    try {
        const unread = JSON.parse(localStorage.getItem('unread_chats') || '{}');
        if (hasUnread) {
            unread[friendAddress] = true;
        } else {
            delete unread[friendAddress];
        }
        localStorage.setItem('unread_chats', JSON.stringify(unread));
        window.dispatchEvent(new Event('storage'));
    } catch (e) {
        console.error('Error updating unread status:', e);
    }
};

/**
 * Hook to check for unread messages across all friends
 */
export function useUnreadMessages(friends, selectedChatId) {
    const { publicKey, connected } = useWallet();
    const checkingRef = useRef(false);

    // 标记当前聊天为已读
    const markAsRead = useCallback((friendAddress) => {
        setUnreadStatus(friendAddress, false);
    }, []);

    // 检查单个好友的未读消息
    const checkFriendUnread = useCallback(async (friendAddress) => {
        if (!publicKey || !connected) return;

        try {
            const program = getProgram({ publicKey });
            const friendPubkey = new PublicKey(friendAddress);
            const [chatRoomPDA] = getChatRoomPDA(publicKey, friendPubkey);

            const chatRoom = await program.account.chatRoom.fetchNullable(chatRoomPDA);
            if (!chatRoom) return;

            const allMessages = await program.account.message.all([
                {
                    memcmp: {
                        offset: 8,
                        bytes: chatRoomPDA.toBase58(),
                    },
                },
            ]);

            const currentCount = allMessages.length;
            const lastReadCounts = getLastReadCounts();
            const lastCount = lastReadCounts[friendAddress] || 0;

            // 如果有新消息
            if (currentCount > lastCount) {
                // 检查最新消息是否来自对方
                const sortedMessages = allMessages
                    .map(m => ({
                        sender: m.account.sender.toString(),
                        timestamp: m.account.timestamp.toNumber(),
                    }))
                    .sort((a, b) => b.timestamp - a.timestamp);

                const latestMsg = sortedMessages[0];
                if (latestMsg && latestMsg.sender !== publicKey.toString()) {
                    // 新消息来自对方，设置未读
                    setUnreadStatus(friendAddress, true);
                    console.log(`🔴 New unread message from ${friendAddress.slice(0, 8)}...`);
                }
            }

            // 如果当前正在查看这个聊天，更新已读计数
            if (selectedChatId === friendAddress) {
                setLastReadCount(friendAddress, currentCount);
                setUnreadStatus(friendAddress, false);
            }
        } catch (err) {
            // 静默失败，不影响其他检查
            console.debug('Error checking unread for', friendAddress.slice(0, 8), err.message);
        }
    }, [publicKey, connected, selectedChatId]);

    // 检查所有好友的未读消息
    const checkAllUnread = useCallback(async () => {
        if (!publicKey || !connected || !friends?.length || checkingRef.current) return;

        checkingRef.current = true;
        console.log('🔍 Checking unread messages for all friends...');

        for (const friend of friends) {
            await checkFriendUnread(friend.address);
            // 小延迟避免 rate limit
            await new Promise(r => setTimeout(r, 200));
        }

        checkingRef.current = false;
    }, [publicKey, connected, friends, checkFriendUnread]);

    // 定期检查未读消息
    useEffect(() => {
        if (!publicKey || !connected || !friends?.length) return;

        // 初始检查
        checkAllUnread();

        // 每 30 秒检查一次
        const interval = setInterval(checkAllUnread, 30000);

        return () => clearInterval(interval);
    }, [publicKey, connected, friends, checkAllUnread]);

    // 当选中聊天变化时，标记为已读
    useEffect(() => {
        if (selectedChatId && selectedChatId !== 'ai') {
            markAsRead(selectedChatId);
        }
    }, [selectedChatId, markAsRead]);

    return { markAsRead, checkAllUnread };
}

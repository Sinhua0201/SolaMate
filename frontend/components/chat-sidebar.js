import { useState, useEffect } from 'react';
import { Search, Bot, User, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFriendsCache } from '@/hooks/useFriendsCache';

// Helper to get avatar path from filename
const getAvatarPath = (name) => name ? `/avatar/${name}` : null;

// 获取未读状态
const getUnreadChats = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('unread_chats') || '{}');
  } catch {
    return {};
  }
};

export default function ChatSidebar({ selectedChat, onSelectChat, unreadChats = {} }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localUnread, setLocalUnread] = useState({});

  // 使用共享的好友缓存
  const { friends, isLoading } = useFriendsCache();

  // 监听 localStorage 变化和 props
  useEffect(() => {
    setLocalUnread(getUnreadChats());
    
    const handleStorage = () => setLocalUnread(getUnreadChats());
    window.addEventListener('storage', handleStorage);
    
    // 定期检查更新
    const interval = setInterval(() => setLocalUnread(getUnreadChats()), 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // 合并 props 和 localStorage 的未读状态
  const mergedUnread = { ...localUnread, ...unreadChats };



  const filteredFriends = friends.filter(friend =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const aiChat = {
    id: 'ai',
    name: 'AI Assistant',
    type: 'ai',
    avatar: <Bot className="h-6 w-6" />,
    lastMessage: 'Ask me anything!',
  };

  return (
    <div className="w-80 bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-purple-300/40 shadow-xl shadow-purple-500/20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-100/50">
        <h2 className="text-xl font-bold text-neutral-800 mb-3">Chats</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 glass-scroll">
        <div className="p-3">
          {/* AI Chat - Always first */}
          <ChatItem
            chat={aiChat}
            isSelected={selectedChat?.id === 'ai'}
            onClick={() => onSelectChat(aiChat)}
          />

          {/* Friends */}
          {isLoading ? (
            <div className="text-center py-8 text-neutral-500">
              Loading chats...
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No chats yet</p>
              <p className="text-sm mt-1">Add friends to start chatting!</p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <ChatItem
                key={friend.address}
                chat={{
                  id: friend.address,
                  name: friend.displayName,
                  type: 'friend',
                  avatarSrc: friend.avatar ? getAvatarPath(friend.avatar) : null,
                  lastMessage: friend.lastMessage,
                  unread: friend.unread,
                  hasUnread: mergedUnread[friend.address] === true,
                }}
                isSelected={selectedChat?.id === friend.address}
                onClick={() => onSelectChat({
                  id: friend.address,
                  name: friend.displayName,
                  username: friend.username,
                  avatar: friend.avatar,
                  type: 'friend',
                })}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div >
  );
}

function ChatItem({ chat, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 rounded-2xl cursor-pointer ios-transition mb-2
        ${isSelected
          ? 'glass bg-purple-500/10 border border-purple-300/30 shadow-lg'
          : 'hover:bg-black/5 text-neutral-600'
        }
      `}
    >
      {/* Avatar */}
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0
        ${chat.type === 'ai'
          ? 'bg-gradient-to-br from-purple-500 to-cyan-500 shadow-purple-500/20'
          : 'bg-gradient-to-br from-blue-500 to-green-500 shadow-blue-500/20'
        }
      `}>
        {chat.type === 'ai' ? (
          <Bot className="h-6 w-6 text-white" />
        ) : chat.avatarSrc ? (
          <img src={chat.avatarSrc} alt={chat.name} className="w-full h-full object-cover" />
        ) : (
          <User className="h-6 w-6 text-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold truncate text-neutral-800">{chat.name}</h3>
            {/* Red dot for unread messages - next to username */}
            {chat.hasUnread && !isSelected && (
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            )}
          </div>
          {chat.unread > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg shadow-blue-500/30">
              {chat.unread}
            </span>
          )}
        </div>
        {chat.lastMessage && (
          <p className="text-sm text-neutral-500 truncate">{chat.lastMessage}</p>
        )}
      </div>
    </div>
  );
}

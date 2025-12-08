import { useState } from 'react';
import { Search, Bot, User, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFriendsCache } from '@/hooks/useFriendsCache';

export default function ChatSidebar({ selectedChat, onSelectChat }) {
  const [searchQuery, setSearchQuery] = useState('');

  // 使用共享的好友缓存
  const { friends, isLoading } = useFriendsCache();



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
    <div className="w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-3">Chats</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-10 bg-neutral-800 border-neutral-700 text-white"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* AI Chat - Always first */}
          <ChatItem
            chat={aiChat}
            isSelected={selectedChat?.id === 'ai'}
            onClick={() => onSelectChat(aiChat)}
          />

          {/* Friends */}
          {isLoading ? (
            <div className="text-center py-8 text-neutral-400">
              Loading chats...
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
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
                  avatar: <User className="h-6 w-6" />,
                  lastMessage: friend.lastMessage,
                  unread: friend.unread,
                }}
                isSelected={selectedChat?.id === friend.address}
                onClick={() => onSelectChat({
                  id: friend.address,
                  name: friend.displayName,
                  username: friend.username,
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
        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors mb-1
        ${isSelected
          ? 'bg-blue-600 text-white'
          : 'hover:bg-neutral-800 text-neutral-300'
        }
      `}
    >
      {/* Avatar */}
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center
        ${chat.type === 'ai'
          ? 'bg-gradient-to-br from-purple-500 to-cyan-500'
          : 'bg-gradient-to-br from-blue-500 to-green-500'
        }
      `}>
        {chat.avatar}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold truncate">{chat.name}</h3>
          {chat.unread > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {chat.unread}
            </span>
          )}
        </div>
        {chat.lastMessage && (
          <p className="text-sm opacity-70 truncate">{chat.lastMessage}</p>
        )}
      </div>
    </div>
  );
}

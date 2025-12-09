import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import ChatSidebar from '@/components/chat-sidebar';
import ChatWindow from '@/components/chat-window';

export default function ChatPage() {
  const { publicKey, connected } = useWallet();
  const [selectedChat, setSelectedChat] = useState(null);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if (connected && publicKey) {
      loadFriends();
    }
  }, [connected, publicKey]);

  useEffect(() => {
    // 从 localStorage 读取选中的聊天
    const savedChat = localStorage.getItem('selectedChat');
    if (savedChat) {
      try {
        const chat = JSON.parse(savedChat);
        setSelectedChat(chat);
        // 清除 localStorage
        localStorage.removeItem('selectedChat');
      } catch (err) {
        console.error('Error parsing saved chat:', err);
      }
    }
  }, []);

  const loadFriends = async () => {
    // 加载好友列表
    // TODO: 从区块链获取
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Subtle animated background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/30 via-transparent to-transparent pointer-events-none" />
      
      <Navbar />
      
      <div className="flex h-[calc(100vh-95px)] relative p-4 gap-4">
        {/* 左侧边栏 */}
        <ChatSidebar
          friends={friends}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
        />

        {/* 右侧聊天窗口 */}
        <ChatWindow
          selectedChat={selectedChat}
        />
      </div>
    </div>
  );
}

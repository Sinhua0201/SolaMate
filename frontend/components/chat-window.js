import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSendMessage, useInitializeChatRoom } from '@/lib/solana/hooks/useChatProgram';
import { useRecordExpense, ExpenseCategory } from '@/lib/solana/hooks/useExpenseProgram';

export default function ChatWindow({ selectedChat }) {
  const { publicKey, connected, sendTransaction: walletSendTransaction } = useWallet();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [friends, setFriends] = useState([]);
  const [showPaymentMenu, setShowPaymentMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState(null); // 'send' or 'request'
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCategory, setPaymentCategory] = useState('other');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const EXPENSE_CATEGORIES = [
    { id: 'dining', name: 'Dining', emoji: '🍽️' },
    { id: 'shopping', name: 'Shopping', emoji: '🛍️' },
    { id: 'entertainment', name: 'Entertainment', emoji: '🎮' },
    { id: 'travel', name: 'Travel', emoji: '✈️' },
    { id: 'gifts', name: 'Gifts', emoji: '🎁' },
    { id: 'bills', name: 'Bills', emoji: '📄' },
    { id: 'other', name: 'Other', emoji: '📦' },
  ];

  const { sendMessage, isLoading: isSending } = useSendMessage();
  const { initializeChatRoom } = useInitializeChatRoom();
  const { recordExpense } = useRecordExpense();

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  useEffect(() => {
    // 加载好友列表用于 @ 提及
    if (connected && publicKey && selectedChat?.type === 'ai') {
      loadFriends();
    }
  }, [connected, publicKey, selectedChat]);

  const loadFriends = async () => {
    try {
      const { getProgram } = await import('@/lib/solana/anchorSetup');
      const program = getProgram({ publicKey });
      
      const friendships = await program.account.friendship.all();
      const acceptedFriends = [];
      
      for (const friendship of friendships) {
        const { userA, userB, status } = friendship.account;
        
        if (status.accepted) {
          const isUserA = userA.toString() === publicKey.toString();
          const isUserB = userB.toString() === publicKey.toString();
          
          if (isUserA || isUserB) {
            const friendAddr = isUserA ? userB.toString() : userA.toString();
            const response = await fetch(`/api/profile?walletAddress=${friendAddr}`);
            const data = await response.json();
            
            if (data.success && data.exists) {
              acceptedFriends.push({
                address: friendAddr,
                username: data.profile.username,
                displayName: data.profile.displayName,
              });
            }
          }
        }
      }
      
      setFriends(acceptedFriends);
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };

  useEffect(() => {
    // 自动滚动到底部
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedChat || !publicKey) return;

    setIsLoadingMessages(true);
    try {
      if (selectedChat.type === 'ai') {
        // AI 聊天从本地存储加载
        const aiMessages = JSON.parse(localStorage.getItem('ai_messages') || '[]');
        setMessages(aiMessages);
      } else {
        // 好友聊天从区块链加载
        const { getProgram } = await import('@/lib/solana/anchorSetup');
        const { getChatRoomPDA, getMessagePDA } = await import('@/lib/solana/pdaHelpers');
        const { PublicKey } = await import('@solana/web3.js');
        
        const program = getProgram({ publicKey });
        const friendPubkey = new PublicKey(selectedChat.id);
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
                isPaymentRequest: !isMine, // 只有接收者看到按钮
                paymentRequestData: {
                  amount,
                  requester,
                },
              };
            }
            
            // 检查是否是转账成功通知
            if (content.startsWith('TRANSFER_SUCCESS:')) {
              const [, amount, signature, senderAddr] = content.split(':');
              return {
                id: m.publicKey.toString(),
                content: `✅ Transfer successful!\n\n${amount} SOL received from @${selectedChat.username}\n\nTransaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
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
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !connected) return;

    const newMessage = {
      id: Date.now(),
      content: inputMessage,
      sender: publicKey.toString(),
      timestamp: new Date().toISOString(),
      isMine: true,
    };

    if (selectedChat.type === 'ai') {
      // AI 聊天
      const aiMessages = [...messages, newMessage];
      setMessages(aiMessages);
      localStorage.setItem('ai_messages', JSON.stringify(aiMessages));
      const userInput = inputMessage;
      setInputMessage('');

      // 检查是否是转账命令
      const sendSolMatch = userInput.match(/send\s+sol\s+([\d.]+)\s+(?:to\s+)?@?(\w+)/i);
      
      if (sendSolMatch) {
        const [, amount, username] = sendSolMatch;
        
        // 查找好友
        const friend = friends.find(f => f.username.toLowerCase() === username.toLowerCase());
        
        if (friend) {
          // 显示确认对话框
          handleTransferRequest(amount, friend, aiMessages);
        } else {
          // 好友不存在
          setTimeout(() => {
            const aiReply = {
              id: Date.now() + 1,
              content: `❌ User @${username} not found in your friends list.\n\nMake sure they are your friend first!`,
              sender: 'ai',
              timestamp: new Date().toISOString(),
              isMine: false,
            };
            const updatedMessages = [...aiMessages, aiReply];
            setMessages(updatedMessages);
            localStorage.setItem('ai_messages', JSON.stringify(updatedMessages));
          }, 500);
        }
      } else {
        // 普通 AI 回复 - 智能回复
        setTimeout(() => {
          let aiResponse = '';
          const lowerInput = userInput.toLowerCase();
          
          // 简单的关键词匹配回复
          if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
            aiResponse = 'Hello! 👋 I\'m your SolaMate AI assistant. I can help you:\n\n• Send SOL to friends (try: "send sol 0.1 to @username")\n• Chat and answer questions\n• Manage your crypto activities\n\nHow can I help you today?';
          } else if (lowerInput.includes('help') || lowerInput.includes('command')) {
            aiResponse = '🤖 Available Commands:\n\n💰 Transfer SOL:\n"send sol [amount] to @username"\nExample: send sol 0.1 to @alice\n\n📊 More features coming soon:\n• Check balance\n• View transaction history\n• Expense tracking\n\nWhat would you like to do?';
          } else if (lowerInput.includes('balance') || lowerInput.includes('how much')) {
            aiResponse = '💰 Balance check feature coming soon!\n\nFor now, you can check your balance in your wallet or on Solana Explorer.';
          } else if (lowerInput.includes('friend') || lowerInput.includes('add')) {
            aiResponse = '👥 To add friends:\n\n1. Click the "Friends" button in the navigation\n2. Enter their wallet address\n3. Send a friend request\n4. Wait for them to accept\n\nOnce they\'re your friend, you can send them SOL directly through me!';
          } else if (lowerInput.includes('thank')) {
            aiResponse = 'You\'re welcome! 😊 Happy to help!';
          } else if (lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
            aiResponse = 'Goodbye! 👋 Feel free to come back anytime you need help!';
          } else {
            // 默认回复
            const responses = [
              'I\'m here to help! You can ask me about sending SOL, managing friends, or just chat. 😊',
              'Interesting! I\'m still learning, but I can help you send SOL to your friends. Try: "send sol 0.1 to @username"',
              'That\'s cool! By the way, did you know you can send SOL to friends just by chatting with me? Try it out!',
              'I understand! Let me know if you need help with anything. I\'m great at sending SOL to your friends! 💰',
              'Thanks for chatting! I can help you transfer SOL, manage friends, and more. What would you like to do?',
            ];
            aiResponse = responses[Math.floor(Math.random() * responses.length)];
          }
          
          const aiReply = {
            id: Date.now() + 1,
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            isMine: false,
          };
          const updatedMessages = [...aiMessages, aiReply];
          setMessages(updatedMessages);
          localStorage.setItem('ai_messages', JSON.stringify(updatedMessages));
        }, 800);
      }
    } else {
      // 好友聊天 - 发送到区块链
      try {
        const result = await sendMessage(selectedChat.id, inputMessage);
        
        if (result.success) {
          setMessages([...messages, newMessage]);
          setInputMessage('');
        } else {
          alert('Failed to send message: ' + result.error);
        }
      } catch (err) {
        console.error('Error sending message:', err);
        alert('Failed to send message');
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputMessage(value);

    // 检测 @ 符号
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && selectedChat?.type === 'ai') {
      const textAfterAt = value.slice(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(' ');
      
      if (!hasSpace) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const selectMention = (username) => {
    const lastAtIndex = inputMessage.lastIndexOf('@');
    const newMessage = inputMessage.slice(0, lastAtIndex) + '@' + username + ' ';
    setInputMessage(newMessage);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(mentionSearch) ||
    f.displayName.toLowerCase().includes(mentionSearch)
  );

  const handleTransferRequest = async (amount, friend, currentMessages, expenseData) => {
    // 显示确认消息
    const confirmMsg = {
      id: Date.now() + 1,
      content: `💰 Transfer Request\n\nAmount: ${amount} SOL\nTo: @${friend.username} (${friend.displayName})\nAddress: ${friend.address}\n${expenseData ? `\nDescription: ${expenseData.description}\nCategory: ${EXPENSE_CATEGORIES.find(c => c.id === expenseData.category)?.emoji} ${EXPENSE_CATEGORIES.find(c => c.id === expenseData.category)?.name}` : ''}\n\nConfirm this transfer?`,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      isMine: false,
      isConfirmation: true,
      transferData: { amount, friend, expenseData },
    };
    
    const updatedMessages = [...currentMessages, confirmMsg];
    setMessages(updatedMessages);
    localStorage.setItem('ai_messages', JSON.stringify(updatedMessages));
  };

  const handlePaymentAction = (type) => {
    setPaymentType(type);
    setShowPaymentMenu(false);
    setShowPaymentModal(true);
  };

  const handlePaymentRequestResponse = async (accept, amount, requester) => {
    if (accept) {
      // 接受请求 - 直接执行转账
      const friend = {
        address: requester,
        username: selectedChat.username,
        displayName: selectedChat.name,
      };
      
      // 直接执行转账，不显示确认对话框
      await executeTransferDirect(amount, friend);
    } else {
      // 拒绝请求
      const rejectMsg = {
        id: Date.now(),
        content: `❌ Payment request rejected`,
        sender: publicKey.toString(),
        timestamp: new Date().toISOString(),
        isMine: true,
      };
      setMessages(prev => [...prev, rejectMsg]);
      sendMessage(selectedChat.id, `Payment request for ${amount} SOL was rejected`);
    }
  };

  const executeTransferDirect = async (amount, friend) => {
    try {
      const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      
      // 显示处理中消息
      const processingMsg = {
        id: Date.now(),
        content: `⏳ Processing transfer of ${amount} SOL to @${friend.username}...\n\nPlease approve the transaction in your wallet.`,
        sender: publicKey.toString(),
        timestamp: new Date().toISOString(),
        isMine: true,
      };
      setMessages(prev => [...prev, processingMsg]);

      // 创建转账交易
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const recipientPubkey = new PublicKey(friend.address);
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // 发送交易
      const signature = await walletSendTransaction(transaction, connection);
      
      // 等待确认
      await connection.confirmTransaction(signature, 'confirmed');

      // 显示成功消息（发送者看到）
      const successMsg = {
        id: Date.now() + 1,
        content: `✅ Transfer successful!\n\n${amount} SOL sent to @${friend.username}\n\nTransaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
        sender: publicKey.toString(),
        timestamp: new Date().toISOString(),
        isMine: true,
        explorerLink: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      };
      
      setMessages(prev => [...prev.filter(m => m.id !== processingMsg.id), successMsg]);
      
      // 发送成功通知给对方（使用 selectedChat.id 而不是 friend.address）
      await sendMessage(selectedChat.id, `TRANSFER_SUCCESS:${amount}:${signature}:${publicKey.toString()}`);
      
      // 记录消费到区块链（使用选择的分类）
      try {
        const categoryMap = {
          'dining': ExpenseCategory.Dining,
          'shopping': ExpenseCategory.Shopping,
          'entertainment': ExpenseCategory.Entertainment,
          'travel': ExpenseCategory.Travel,
          'gifts': ExpenseCategory.Gifts,
          'bills': ExpenseCategory.Bills,
          'other': ExpenseCategory.Other,
        };
        
        const expenseResult = await recordExpense({
          recipientAddress: friend.address,
          amount: lamports,
          category: categoryMap[paymentCategory] || ExpenseCategory.Other,
          description: `Transfer to @${friend.username}`,
          txSignature: signature,
        });
        
        if (expenseResult.success) {
          console.log('Expense recorded to blockchain:', expenseResult.signature);
        }
      } catch (expenseErr) {
        console.error('Failed to record expense:', expenseErr);
        // 不影响转账成功的显示
      }
    } catch (err) {
      console.error('Transfer error:', err);
      
      // 显示错误消息
      const errorMsg = {
        id: Date.now() + 2,
        content: `❌ Transfer failed: ${err.message}\n\nPlease try again or check your balance.`,
        sender: publicKey.toString(),
        timestamp: new Date().toISOString(),
        isMine: true,
      };
      
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const friend = {
      address: selectedChat.id,
      username: selectedChat.username,
      displayName: selectedChat.name,
    };

    if (paymentType === 'send') {
      // 发送 SOL - 直接执行转账
      if (selectedChat.type === 'friend') {
        // 好友聊天 - 直接转账，不需要确认
        await executeTransferDirect(paymentAmount, friend);
      } else {
        // AI 聊天 - 显示确认消息
        const categoryName = EXPENSE_CATEGORIES.find(c => c.id === paymentCategory)?.name || 'Other';
        const expenseData = {
          description: `${categoryName} - Payment to @${friend.username}`,
          category: paymentCategory,
        };
        handleTransferRequest(paymentAmount, friend, messages, expenseData);
      }
    } else {
      // 请求 SOL - 发送带有特殊标记的消息
      const requestContent = `PAYMENT_REQUEST:${paymentAmount}:${publicKey.toString()}`;
      
      // 发送到区块链
      sendMessage(selectedChat.id, requestContent);
      
      // 在本地显示
      const requestMsg = {
        id: Date.now(),
        content: `💰 Payment Request\n\nRequesting ${paymentAmount} SOL from @${friend.username}`,
        sender: publicKey.toString(),
        timestamp: new Date().toISOString(),
        isMine: true,
      };
      setMessages(prev => [...prev, requestMsg]);
    }

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentCategory('other');
  };

  const executeTransfer = async (amount, friend) => {
    try {
      const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      
      // 显示处理中消息
      const processingMsg = {
        id: Date.now(),
        content: `⏳ Processing transfer of ${amount} SOL to @${friend.username}...\n\nPlease approve the transaction in your wallet.`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isMine: false,
      };
      setMessages(prev => {
        const updated = [...prev, processingMsg];
        localStorage.setItem('ai_messages', JSON.stringify(updated));
        return updated;
      });

      // 创建转账交易
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const recipientPubkey = new PublicKey(friend.address);
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // 发送交易
      const signature = await walletSendTransaction(transaction, connection);
      
      // 等待确认
      await connection.confirmTransaction(signature, 'confirmed');

      // 显示成功消息
      const successMsg = {
        id: Date.now() + 1,
        content: `✅ Transfer successful!\n\n${amount} SOL sent to @${friend.username}\n\nTransaction: ${signature.slice(0, 8)}...${signature.slice(-8)}\n\nView on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isMine: false,
      };
      
      setMessages(prev => {
        const updated = [...prev.filter(m => m.id !== processingMsg.id), successMsg];
        localStorage.setItem('ai_messages', JSON.stringify(updated));
        return updated;
      });
      
      // 记录消费到区块链
      try {
        const expenseResult = await recordExpense({
          recipientAddress: friend.address,
          amount: lamports,
          category: ExpenseCategory.Other,
          description: `AI Transfer to @${friend.username}`,
          txSignature: signature,
        });
        
        if (expenseResult.success) {
          console.log('Expense recorded to blockchain:', expenseResult.signature);
        }
      } catch (expenseErr) {
        console.error('Failed to record expense:', expenseErr);
      }
    } catch (err) {
      console.error('Transfer error:', err);
      
      // 显示错误消息
      const errorMsg = {
        id: Date.now() + 2,
        content: `❌ Transfer failed: ${err.message}\n\nPlease try again or check your balance.`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isMine: false,
      };
      
      setMessages(prev => {
        const updated = [...prev, errorMsg];
        localStorage.setItem('ai_messages', JSON.stringify(updated));
        return updated;
      });
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-950">
        <div className="text-center text-neutral-400">
          <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Welcome to SolaMate Chat</h3>
          <p>Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Payment modal - fixed position, centered on screen */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl p-6 w-full max-w-md border-2 border-neutral-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              {paymentType === 'send' ? '💸 Send SOL' : '💰 Request SOL'}
            </h3>
            <p className="text-sm text-neutral-400 mb-6">
              {paymentType === 'send' 
                ? `Send SOL to @${selectedChat?.username}` 
                : `Request SOL from @${selectedChat?.username}`
              }
            </p>
            
            {/* Amount */}
            <div className="mb-6">
              <label className="text-sm text-neutral-300 mb-2 block font-medium">Amount (SOL)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="bg-neutral-900 border-neutral-700 text-white text-lg h-12"
                autoFocus
              />
            </div>

            {/* Category - only for send */}
            {paymentType === 'send' && (
              <div className="mb-6">
                <label className="text-sm text-neutral-300 mb-3 block font-medium">Select Category</label>
                <div className="grid grid-cols-4 gap-3">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setPaymentCategory(cat.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 ${
                        paymentCategory === cat.id
                          ? 'bg-purple-600 border-purple-500 scale-110 shadow-lg shadow-purple-500/50'
                          : 'bg-neutral-900 border-neutral-700 hover:border-neutral-600 hover:scale-105'
                      }`}
                      title={cat.name}
                    >
                      <span className="text-3xl">{cat.emoji}</span>
                      <span className="text-xs text-neutral-300 font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                onClick={handlePaymentSubmit}
                className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {paymentType === 'send' ? 'Send Payment' : 'Send Request'}
              </Button>
              <Button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount('');
                  setPaymentCategory('other');
                }}
                variant="outline"
                className="flex-1 h-12 text-base font-semibold bg-neutral-700 border-neutral-600 hover:bg-neutral-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col bg-neutral-950">
        {/* Chat Header */}
      <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center px-6">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center mr-3
          ${selectedChat.type === 'ai'
            ? 'bg-gradient-to-br from-purple-500 to-cyan-500'
            : 'bg-gradient-to-br from-blue-500 to-green-500'
          }
        `}>
          {selectedChat.type === 'ai' ? (
            <Bot className="h-5 w-5 text-white" />
          ) : (
            <User className="h-5 w-5 text-white" />
          )}
        </div>
        <div>
          <h2 className="text-white font-semibold">{selectedChat.name}</h2>
          {selectedChat.username && (
            <p className="text-sm text-neutral-400">@{selectedChat.username}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-400">
            <div className="text-center">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isAI={selectedChat.type === 'ai' && !message.isMine}
                onConfirmTransfer={executeTransfer}
                onPaymentRequestResponse={handlePaymentRequestResponse}
                onCancelTransfer={() => {
                  const cancelMsg = {
                    id: Date.now(),
                    content: '❌ Transfer cancelled.',
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    isMine: false,
                  };
                  setMessages(prev => {
                    const updated = [...prev, cancelMsg];
                    localStorage.setItem('ai_messages', JSON.stringify(updated));
                    return updated;
                  });
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-neutral-900 border-t border-neutral-800 relative">
        {/* Mention suggestions */}
        {showMentions && filteredFriends.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredFriends.map((friend) => (
              <button
                key={friend.address}
                onClick={() => selectMention(friend.username)}
                className="w-full flex items-center gap-3 p-3 hover:bg-neutral-700 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{friend.displayName}</p>
                  <p className="text-xs text-neutral-400">@{friend.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Payment menu */}
        {showPaymentMenu && selectedChat?.type === 'friend' && (
          <div className="absolute bottom-full left-4 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => handlePaymentAction('send')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                <Send className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Send SOL</p>
                <p className="text-xs text-neutral-400">Transfer SOL to this friend</p>
              </div>
            </button>
            <button
              onClick={() => handlePaymentAction('request')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition-colors text-left border-t border-neutral-700"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Request SOL</p>
                <p className="text-xs text-neutral-400">Request payment from this friend</p>
              </div>
            </button>
          </div>
        )}

        {/* Payment modal - moved outside to be centered on screen */}

        {selectedChat?.type === 'ai' && (
          <div className="mb-2 text-xs text-neutral-500">
            💡 Try: &quot;send sol 0.1 to @username&quot;
          </div>
        )}

        <div className="flex gap-2">
          {/* + Button for friends */}
          {selectedChat?.type === 'friend' && (
            <Button
              onClick={() => setShowPaymentMenu(!showPaymentMenu)}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
              size="icon"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          )}
          
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={selectedChat?.type === 'ai' ? "Type a command or message... (use @ to mention friends)" : "Type a message..."}
            className="flex-1 bg-neutral-800 border-neutral-700 text-white"
            disabled={!connected || isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !connected || isSending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}

function MessageBubble({ message, isAI, onConfirmTransfer, onCancelTransfer, onPaymentRequestResponse }) {
  const isMine = message.isMine;
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2 max-w-[70%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isMine && (
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            ${isAI
              ? 'bg-gradient-to-br from-purple-500 to-cyan-500'
              : 'bg-gradient-to-br from-blue-500 to-green-500'
            }
          `}>
            {isAI ? (
              <Bot className="h-4 w-4 text-white" />
            ) : (
              <User className="h-4 w-4 text-white" />
            )}
          </div>
        )}

        {/* Message */}
        <div>
          <div className={`
            px-4 py-2 rounded-2xl
            ${isMine
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-neutral-800 text-white rounded-bl-sm'
            }
          `}>
            <p className="break-words whitespace-pre-line">{message.content}</p>
            
            {/* Payment Request buttons */}
            {message.isPaymentRequest && message.paymentRequestData && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => onPaymentRequestResponse(true, message.paymentRequestData.amount, message.paymentRequestData.requester)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ✓ Accept & Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPaymentRequestResponse(false, message.paymentRequestData.amount, message.paymentRequestData.requester)}
                  className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
                >
                  ✗ Reject
                </Button>
              </div>
            )}

            {/* Confirmation buttons */}
            {message.isConfirmation && message.transferData && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => onConfirmTransfer(message.transferData.amount, message.transferData.friend)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ✓ Confirm Transfer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancelTransfer()}
                  className="bg-neutral-700 hover:bg-neutral-600 border-neutral-600"
                >
                  ✗ Cancel
                </Button>
              </div>
            )}
          </div>
          <p className={`text-xs text-neutral-500 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}

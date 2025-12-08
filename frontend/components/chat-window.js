import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Send, Bot, User, Loader2, Mic, MicOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSendMessage, useInitializeChatRoom } from '@/lib/solana/hooks/useChatProgram';
import { useRecordExpense, ExpenseCategory } from '@/lib/solana/hooks/useExpenseProgram';
import { useRealtimeChatWebSocket } from '@/hooks/useRealtimeChatWebSocket';

export default function ChatWindow({ selectedChat }) {
  const { publicKey, connected, sendTransaction: walletSendTransaction } = useWallet();
  const [aiMessages, setAiMessages] = useState([]); // AI 聊天消息
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // 使用 WebSocket 实时监听好友聊天（只在好友聊天时启用）
  const {
    messages: friendMessages,
    isLoading: isFriendMessagesLoading,
    refresh: refreshFriendMessages,
    isIdle: isChatIdle,
    resetActivity: resetChatActivity
  } = useRealtimeChatWebSocket(selectedChat?.type === 'friend' ? selectedChat?.id : null);

  // 根据聊天类型选择消息源
  const messages = selectedChat?.type === 'ai' ? aiMessages : friendMessages;
  const isLoading = selectedChat?.type === 'ai' ? isLoadingMessages : isFriendMessagesLoading;
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [friends, setFriends] = useState([]);
  const [showPaymentMenu, setShowPaymentMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState(null); // 'send' or 'request'
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCategory, setPaymentCategory] = useState('other');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
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

    // 只处理 AI 聊天，好友聊天由 WebSocket hook 处理
    if (selectedChat.type === 'ai') {
      setIsLoadingMessages(true);
      const startTime = Date.now();

      try {
        const aiMsgs = JSON.parse(localStorage.getItem('ai_messages') || '[]');
        setAiMessages(aiMsgs);
      } catch (err) {
        console.error('Error loading AI messages:', err);
        setAiMessages([]);
      } finally {
        // 确保 loading 至少显示 300ms
        const elapsed = Date.now() - startTime;
        const minLoadingTime = 300;
        if (elapsed < minLoadingTime) {
          setTimeout(() => setIsLoadingMessages(false), minLoadingTime - elapsed);
        } else {
          setIsLoadingMessages(false);
        }
      }
    }
    // 好友聊天消息由 useRealtimeChatWebSocket hook 自动处理
  };

  // 解析转账指令 - 支持智能分类检测
  const parseTransferCommand = (text) => {
    const patterns = [
      /(?:send|transfer|pay)\s+(?:sol\s+)?(\d+\.?\d*)\s+(?:sol\s+)?(?:to\s+)?@?(\w+)(?:\s+for\s+(.+))?/i,
      /(?:give|送|转)\s+@?(\w+)\s+(\d+\.?\d*)\s+sol(?:\s+(.+))?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const result = {
          amount: parseFloat(match[1]),
          recipient: match[2],
          reason: match[3] || 'Transfer',
          isValid: true,
          category: null,
        };

        // 检测文本中是否提到了分类
        const lowerText = text.toLowerCase();
        const categoryKeywords = {
          'dining': ['dining', 'food', 'restaurant', 'lunch', 'dinner', 'breakfast', 'coffee', 'meal', 'eat', '吃饭', '餐饮', '咖啡'],
          'shopping': ['shopping', 'shop', 'buy', 'purchase', 'store', '购物', '买'],
          'entertainment': ['entertainment', 'movie', 'game', 'concert', 'show', 'fun', '娱乐', '电影', '游戏'],
          'travel': ['travel', 'trip', 'flight', 'hotel', 'vacation', 'tour', '旅行', '旅游', '机票'],
          'gifts': ['gift', 'present', 'birthday', 'celebration', '礼物', '生日'],
          'bills': ['bill', 'rent', 'utility', 'payment', 'fee', '账单', '租金'],
          'other': ['other', 'misc', 'miscellaneous', '其他'],
        };

        // 检查是否匹配任何分类关键词
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            result.category = category;
            break;
          }
        }

        return result;
      }
    }

    return { isValid: false };
  };

  // 处理分类选择
  const handleCategorySelect = (category, transferData) => {
    const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === category);
    const confirmMsg = {
      id: Date.now(),
      content: `✅ Category Selected: ${categoryInfo?.emoji} ${categoryInfo?.name}\n\n💰 Transfer Summary\n\nAmount: ${transferData.amount} SOL\nTo: @${transferData.friend.username} (${transferData.friend.displayName})\nCategory: ${categoryInfo?.name}\nReason: ${transferData.reason}\n\nReady to transfer?`,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      isMine: false,
      isConfirmation: true,
      transferData: { ...transferData, category },
    };

    const currentMessages = JSON.parse(localStorage.getItem('ai_messages') || '[]');
    const updatedMessages = [...currentMessages, confirmMsg];
    setAiMessages(updatedMessages);
    localStorage.setItem('ai_messages', JSON.stringify(updatedMessages));
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
      const aiMsgs = [...aiMessages, newMessage];
      setAiMessages(aiMsgs);
      localStorage.setItem('ai_messages', JSON.stringify(aiMsgs));
      const userInput = inputMessage;
      setInputMessage('');

      // 检查是否是转账命令 - 使用新的解析逻辑
      const parsed = parseTransferCommand(userInput);

      if (parsed.isValid) {
        // 查找好友
        const friend = friends.find(f => f.username.toLowerCase() === parsed.recipient.toLowerCase());

        if (friend) {
          // 检查是否已经检测到分类
          if (parsed.category) {
            // 已有分类，直接显示确认消息
            const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === parsed.category);
            const confirmMsg = {
              id: Date.now() + 1,
              content: `💰 Transfer Request\n\nAmount: ${parsed.amount} SOL\nTo: @${friend.username} (${friend.displayName})\nCategory: ${categoryInfo?.emoji} ${categoryInfo?.name}\nReason: ${parsed.reason}\n\nReady to transfer?`,
              sender: 'ai',
              timestamp: new Date().toISOString(),
              isMine: false,
              isConfirmation: true,
              transferData: { amount: parsed.amount, friend, reason: parsed.reason, category: parsed.category },
            };
            const updatedMessages = [...aiMsgs, confirmMsg];
            setAiMessages(updatedMessages);
            localStorage.setItem('ai_messages', JSON.stringify(updatedMessages));
          } else {
            // 没有分类，显示分类选择消息
            const categoryMsg = {
              id: Date.now() + 1,
              content: `💰 Transfer Request\n\nAmount: ${parsed.amount} SOL\nTo: @${friend.username} (${friend.displayName})\n\nPlease select a category for this expense:`,
              sender: 'ai',
              timestamp: new Date().toISOString(),
              isMine: false,
              showCategorySelection: true,
              transferData: { amount: parsed.amount, friend, reason: parsed.reason },
            };
            const updatedMessages = [...aiMsgs, categoryMsg];
            setAiMessages(updatedMessages);
            localStorage.setItem('ai_messages', JSON.stringify(updatedMessages));
          }
        } else {
          // 好友不存在
          setTimeout(() => {
            const aiReply = {
              id: Date.now() + 1,
              content: `❌ User @${parsed.recipient} not found in your friends list.\n\nMake sure they are your friend first!`,
              sender: 'ai',
              timestamp: new Date().toISOString(),
              isMine: false,
            };
            const updatedMessages = [...aiMsgs, aiReply];
            setAiMessages(updatedMessages);
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
          const updatedMessages = [...aiMsgs, aiReply];
          setAiMessages(updatedMessages);
          localStorage.setItem('ai_messages', JSON.stringify(updatedMessages));
        }, 800);
      }
    } else {
      // 好友聊天 - 发送到区块链
      try {
        const result = await sendMessage(selectedChat.id, inputMessage);

        if (result.success) {
          setInputMessage('');
          // WebSocket 会自动更新消息，但手动刷新确保立即显示
          refreshFriendMessages();
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

  // 语音输入处理
  const handleVoiceInput = () => {
    // 检查浏览器支持
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceError('Your browser does not support voice input');
      setTimeout(() => setVoiceError(null), 3000);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // 配置
    recognition.lang = 'en-US'; // 可以改成 'zh-CN' 支持中文
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setVoiceError(null);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input:', transcript);
      setInputMessage(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setVoiceError(`Error: ${event.error}`);
      setIsListening(false);
      setTimeout(() => setVoiceError(null), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setVoiceError('Failed to start voice input');
      setIsListening(false);
      setTimeout(() => setVoiceError(null), 3000);
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
      sendMessage(selectedChat.id, `Payment request for ${amount} SOL was rejected`);
      // WebSocket 会自动更新消息
      refreshFriendMessages();
    }
  };

  const executeTransferDirect = async (amount, friend) => {
    try {
      const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

      // 显示处理中提示
      console.log(`⏳ Processing transfer of ${amount} SOL to @${friend.username}...`);

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

      // 发送成功通知给对方
      await sendMessage(selectedChat.id, `TRANSFER_SUCCESS:${amount}:${signature}:${publicKey.toString()}`);

      // WebSocket 会自动更新消息
      refreshFriendMessages();

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

      // WebSocket 会自动更新消息
      refreshFriendMessages();
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

      // WebSocket 会自动更新消息
      refreshFriendMessages();
    }

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentCategory('other');
  };

  const executeTransfer = async (amount, friend, reason = 'Transfer', category = 'other') => {
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
      setAiMessages(prev => {
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

      setAiMessages(prev => {
        const updated = [...prev.filter(m => m.id !== processingMsg.id), successMsg];
        localStorage.setItem('ai_messages', JSON.stringify(updated));
        return updated;
      });

      // 记录消费到区块链 - 使用选择的分类
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
          category: categoryMap[category] || ExpenseCategory.Other,
          description: `AI Transfer to @${friend.username}: ${reason}`,
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

      setAiMessages(prev => {
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
                      className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 ${paymentCategory === cat.id
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
          {/* Idle Warning Banner */}
          {selectedChat?.type === 'friend' && isChatIdle && (
            <div className="mb-4 p-4 bg-yellow-900/20 border-2 border-yellow-600/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">😴</span>
                  <div>
                    <p className="text-sm font-semibold text-yellow-400">Chat Paused</p>
                    <p className="text-xs text-yellow-300/80">No activity for 1 minute. Click refresh to resume.</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    resetChatActivity();
                    refreshFriendMessages();
                  }}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  🔄 Refresh
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-neutral-400 text-sm">Loading messages...</p>
              </div>
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
                  onCategorySelect={handleCategorySelect}
                  onCancelTransfer={() => {
                    const cancelMsg = {
                      id: Date.now(),
                      content: '❌ Transfer cancelled.',
                      sender: 'ai',
                      timestamp: new Date().toISOString(),
                      isMine: false,
                    };
                    setAiMessages(prev => {
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
              💡 Try: &quot;send sol 0.1 to @username&quot; or use voice input 🎤
            </div>
          )}

          {/* Voice Error Message */}
          {voiceError && (
            <div className="mb-2 text-xs text-red-400 animate-pulse">
              ⚠️ {voiceError}
            </div>
          )}

          {/* Listening Indicator */}
          {isListening && (
            <div className="mb-2 text-xs text-purple-400 animate-pulse">
              🎤 Listening... Speak now
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

            {/* Voice Input Button */}
            <Button
              onClick={handleVoiceInput}
              disabled={!connected || isSending || isListening}
              className={`${isListening
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : 'bg-purple-600 hover:bg-purple-700'
                }`}
              title={voiceError || (isListening ? 'Listening...' : 'Voice Input')}
            >
              {isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            {/* Send Button */}
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

function MessageBubble({ message, isAI, onConfirmTransfer, onCancelTransfer, onPaymentRequestResponse, onCategorySelect }) {
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

            {/* Category Selection */}
            {message.showCategorySelection && message.transferData && (
              <div className="mt-3">
                <CategorySelectionButtons
                  transferData={message.transferData}
                  onSelect={(category) => onCategorySelect(category, message.transferData)}
                />
              </div>
            )}

            {/* Confirmation buttons */}
            {message.isConfirmation && message.transferData && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => onConfirmTransfer(
                    message.transferData.amount,
                    message.transferData.friend,
                    message.transferData.reason || 'Transfer',
                    message.transferData.category || 'other'
                  )}
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

// Category Selection Buttons Component
function CategorySelectionButtons({ transferData, onSelect }) {
  const EXPENSE_CATEGORIES = [
    { id: 'dining', name: 'Dining', emoji: '🍽️' },
    { id: 'shopping', name: 'Shopping', emoji: '🛍️' },
    { id: 'entertainment', name: 'Entertainment', emoji: '🎮' },
    { id: 'travel', name: 'Travel', emoji: '✈️' },
    { id: 'gifts', name: 'Gifts', emoji: '🎁' },
    { id: 'bills', name: 'Bills', emoji: '📄' },
    { id: 'other', name: 'Other', emoji: '📦' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 max-w-md">
      {EXPENSE_CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className="p-3 rounded-xl border-2 border-neutral-700 bg-neutral-900 hover:border-purple-500 hover:bg-neutral-800 transition-all duration-200 flex flex-col items-center gap-1 hover:scale-105"
        >
          <span className="text-2xl">{cat.emoji}</span>
          <span className="text-xs text-neutral-300 font-medium">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}

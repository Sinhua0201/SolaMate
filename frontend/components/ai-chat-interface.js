import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from '@/components/voice-input';
import { Send, Bot, User, Sparkles, X, Calendar, FileText, DollarSign } from 'lucide-react';
import { useRecordExpense, ExpenseCategory } from '@/lib/solana/hooks/useExpenseProgram';
import { useCreateFundingEvent } from '@/lib/solana/hooks/useFundingProgram';
import { useCreateGroupSplit } from '@/lib/solana/hooks/useGroupSplit';
import { useIPFS } from '@/hooks/useIPFS';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const getAvatarPath = (name) => name ? `/avatar/${name}` : null;

/**
 * AI Chat Interface Component
 * AI 聊天界面 - 支持文字和语音输入 + 转账 + 创建 Fund + 创建 Bill
 */
export function AIChatInterface({ onTransferRequest }) {
    const router = useRouter();
    const { publicKey, connected, sendTransaction: walletSendTransaction } = useWallet();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi! I\'m your AI assistant. You can:\n• "Send 2 SOL to @Alice for coffee"\n• "Create fund" - Start a funding event\n• "Create bill @Alice @Bob 1.5 SOL dinner" - Split expenses',
            timestamp: Date.now(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [friends, setFriends] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { recordExpense } = useRecordExpense();

    // Funding & Bill hooks
    const { createEvent, isLoading: isCreatingFund } = useCreateFundingEvent();
    const { createGroupSplit, loading: isCreatingBill } = useCreateGroupSplit();
    const { uploadJSON } = useIPFS();

    // Modal states
    const [showFundModal, setShowFundModal] = useState(false);
    const [fundFormData, setFundFormData] = useState({ title: '', description: '', amount: '', deadline: '' });

    const EXPENSE_CATEGORIES = [
        { id: 'dining', name: 'Dining', emoji: '🍽️' },
        { id: 'shopping', name: 'Shopping', emoji: '🛍️' },
        { id: 'entertainment', name: 'Entertainment', emoji: '🎮' },
        { id: 'travel', name: 'Travel', emoji: '✈️' },
        { id: 'gifts', name: 'Gifts', emoji: '🎁' },
        { id: 'bills', name: 'Bills', emoji: '📄' },
        { id: 'other', name: 'Other', emoji: '📦' },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 加载好友列表
    useEffect(() => {
        if (connected && publicKey) {
            loadFriends();
        }
    }, [connected, publicKey]);

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

    // 解析命令 - 支持转账、创建基金、创建账单
    const parseCommand = (text) => {
        const lowerText = text.toLowerCase().trim();

        // 检测 create fund / create funding event
        if (lowerText.includes('create fund') || lowerText.includes('创建基金') || lowerText.includes('new fund')) {
            return { type: 'create-fund', isValid: true };
        }

        // 检测 create bill with @mentions
        if (lowerText.includes('create bill') || lowerText.includes('split') || lowerText.includes('分账') || lowerText.includes('aa') || lowerText.includes('平分')) {
            const mentionPattern = /@(\w+)/g;
            const mentions = [];
            let match;
            while ((match = mentionPattern.exec(text)) !== null) {
                mentions.push(match[1]);
            }
            const amountMatch = text.match(/(\d+\.?\d*)\s*(?:sol)?/i);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
            let reason = text.replace(/(?:create bill|split|分账|aa|平分)/gi, '').replace(/@\w+/g, '').replace(/\d+\.?\d*\s*(?:sol)?/gi, '').trim() || 'Split Bill';
            return { type: 'create-bill', isValid: true, mentions, amount, reason };
        }

        // 检测转账命令
        const patterns = [
            /(?:send|transfer|pay)\s+(\d+\.?\d*)\s+sol\s+to\s+@?(\w+)(?:\s+for\s+(.+))?/i,
            /(?:give|送|转)\s+@?(\w+)\s+(\d+\.?\d*)\s+sol(?:\s+(.+))?/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const result = { type: 'transfer', amount: parseFloat(match[1]), recipient: match[2], reason: match[3] || 'Transfer', isValid: true, category: null };
                const categoryKeywords = {
                    'dining': ['dining', 'food', 'restaurant', 'lunch', 'dinner', 'breakfast', 'coffee', 'meal', 'eat', '吃饭', '餐饮', '咖啡'],
                    'shopping': ['shopping', 'shop', 'buy', 'purchase', 'store', '购物', '买'],
                    'entertainment': ['entertainment', 'movie', 'game', 'concert', 'show', 'fun', '娱乐', '电影', '游戏'],
                    'travel': ['travel', 'trip', 'flight', 'hotel', 'vacation', 'tour', '旅行', '旅游', '机票'],
                    'gifts': ['gift', 'present', 'birthday', 'celebration', '礼物', '生日'],
                    'bills': ['bill', 'rent', 'utility', 'payment', 'fee', '账单', '租金'],
                    'other': ['other', 'misc', 'miscellaneous', '其他'],
                };
                for (const [category, keywords] of Object.entries(categoryKeywords)) {
                    if (keywords.some(keyword => lowerText.includes(keyword))) {
                        result.category = category;
                        break;
                    }
                }
                return result;
            }
        }

        return { type: 'unknown', isValid: false };
    };

    const handleSendMessage = async (messageText = input) => {
        if (!messageText.trim() || !connected) return;

        const userMessage = { role: 'user', content: messageText, timestamp: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsProcessing(true);

        const parsed = parseCommand(messageText);

        if (parsed.type === 'create-fund') {
            const confirmMsg = {
                role: 'assistant',
                content: '🎯 You want to create a Funding Event!\n\nThis will allow others to apply for funding from your pool.\n\nWould you like to proceed?',
                timestamp: Date.now(),
                action: { type: 'confirm-create-fund' },
            };
            setMessages(prev => [...prev, confirmMsg]);
            setIsProcessing(false);
        } else if (parsed.type === 'create-bill') {
            const mentionedFriends = parsed.mentions.map(username => 
                friends.find(f => f.username?.toLowerCase() === username.toLowerCase())
            ).filter(Boolean);

            if (parsed.mentions.length > 0 && mentionedFriends.length === 0) {
                const errorMsg = { role: 'assistant', content: `❌ Could not find users: ${parsed.mentions.map(m => '@' + m).join(', ')}\n\nMake sure they are in your friends list!`, timestamp: Date.now() };
                setMessages(prev => [...prev, errorMsg]);
                setIsProcessing(false);
                return;
            }

            if (mentionedFriends.length > 0 && parsed.amount) {
                const perPerson = (parsed.amount / mentionedFriends.length).toFixed(4);
                const confirmMsg = {
                    role: 'assistant',
                    content: `📝 Create Bill\n\n💰 Total: ${parsed.amount} SOL\n👥 Members: ${mentionedFriends.map(f => '@' + f.username).join(', ')}\n💵 Per person: ${perPerson} SOL\n📋 Reason: ${parsed.reason}\n\nConfirm to create this bill?`,
                    timestamp: Date.now(),
                    action: { type: 'confirm-create-bill', data: { friends: mentionedFriends, amount: parsed.amount, reason: parsed.reason } },
                };
                setMessages(prev => [...prev, confirmMsg]);
            } else {
                const helpMsg = { role: 'assistant', content: `📝 To create a bill, please include:\n\n• @mention the friends to split with\n• Amount in SOL\n• (Optional) Reason\n\nExample: "create bill @alice @bob 2 SOL dinner"`, timestamp: Date.now() };
                setMessages(prev => [...prev, helpMsg]);
            }
            setIsProcessing(false);
        } else if (parsed.type === 'transfer' && parsed.isValid) {
            const friend = friends.find(f => f.username?.toLowerCase() === parsed.recipient.toLowerCase());
            if (friend) {
                if (parsed.category) {
                    const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === parsed.category);
                    const confirmMsg = {
                        role: 'assistant',
                        content: `💰 Transfer Request\n\nAmount: ${parsed.amount} SOL\nTo: @${friend.username} (${friend.displayName})\nCategory: ${categoryInfo?.emoji} ${categoryInfo?.name}\nReason: ${parsed.reason}\n\nReady to transfer?`,
                        timestamp: Date.now(),
                        action: { type: 'confirm-transfer', data: { amount: parsed.amount, friend, reason: parsed.reason, category: parsed.category } },
                    };
                    setMessages(prev => [...prev, confirmMsg]);
                } else {
                    const categoryMsg = {
                        role: 'assistant',
                        content: `💰 Transfer Request\n\nAmount: ${parsed.amount} SOL\nTo: @${friend.username} (${friend.displayName})\n\nPlease select a category:`,
                        timestamp: Date.now(),
                        action: { type: 'select-category', data: { amount: parsed.amount, friend, reason: parsed.reason } },
                    };
                    setMessages(prev => [...prev, categoryMsg]);
                }
                if (onTransferRequest) onTransferRequest(parsed);
            } else {
                const errorMsg = { role: 'assistant', content: `❌ User @${parsed.recipient} not found in your friends list.`, timestamp: Date.now() };
                setMessages(prev => [...prev, errorMsg]);
            }
            setIsProcessing(false);
        } else {
            // 普通对话 - 友好回复并说明功能
            setTimeout(() => {
                const lowerText = messageText.toLowerCase();
                const greetings = ['hello', 'hi', 'hey', '你好', 'hola', 'yo', 'sup', 'what can you do', 'help', '帮助'];
                const isGreeting = greetings.some(g => lowerText.includes(g));
                
                const assistantMessage = {
                    role: 'assistant',
                    content: isGreeting 
                        ? `Hey there! 👋 I'm your AI assistant. Here's what I can do:\n\n💸 **Transfer SOL**\n"Send 2 SOL to @Alice for coffee"\n\n🎯 **Create Funding Event**\n"Create fund" - Set up a pool for others to apply\n\n📝 **Split Bills**\n"Create bill @Alice @Bob 1.5 SOL dinner"\n\nJust type a command or use @ to mention friends!`
                        : `I'm not sure what you mean. Here's what I can help with:\n\n• 💸 "Send 2 SOL to @Alice for coffee"\n• 🎯 "Create fund" - Start a funding event\n• 📝 "Create bill @Alice @Bob 1.5 SOL dinner"\n\nTry one of these!`,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, assistantMessage]);
                setIsProcessing(false);
            }, 300);
        }
    };

    const handleVoiceTranscript = (transcript) => {
        setInput(transcript);
        // 自动发送
        handleSendMessage(transcript);
    };

    // 处理输入变化，检测 @ 符号
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInput(value);

        // 检测 @ 符号
        const lastAtIndex = value.lastIndexOf('@');
        if (lastAtIndex !== -1) {
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

    // 选择提及的好友
    const selectMention = (username) => {
        const lastAtIndex = input.lastIndexOf('@');
        const newMessage = input.slice(0, lastAtIndex) + '@' + username + ' ';
        setInput(newMessage);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    // 处理键盘事件
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
            e.preventDefault();
            handleSendMessage();
        } else if (e.key === 'Escape') {
            setShowMentions(false);
        }
    };

    // 过滤好友列表
    const filteredFriends = friends.filter(f =>
        f.username?.toLowerCase().includes(mentionSearch) ||
        f.displayName?.toLowerCase().includes(mentionSearch)
    );

    // 处理分类选择
    const handleCategorySelect = (category, transferData) => {
        const confirmMsg = {
            role: 'assistant',
            content: `✅ Category: ${EXPENSE_CATEGORIES.find(c => c.id === category)?.emoji} ${EXPENSE_CATEGORIES.find(c => c.id === category)?.name}\n\n💰 ${transferData.amount} SOL → @${transferData.friend.username}\n\nReady to transfer?`,
            timestamp: Date.now(),
            action: { type: 'confirm-transfer', data: { ...transferData, category } },
        };
        setMessages(prev => [...prev, confirmMsg]);
    };

    // 创建 Funding Event
    const handleCreateFund = async () => {
        if (!fundFormData.title || !fundFormData.amount || !fundFormData.deadline) {
            toast.error('Please fill all required fields');
            return;
        }
        try {
            const eventData = { title: fundFormData.title, description: fundFormData.description, createdAt: Date.now() };
            const ipfsResult = await uploadJSON(eventData, { name: `event-${fundFormData.title}.json` });
            if (!ipfsResult.success) throw new Error('Failed to upload to IPFS');

            const amount = Math.floor(parseFloat(fundFormData.amount) * LAMPORTS_PER_SOL);
            const deadline = Math.floor(new Date(fundFormData.deadline).getTime() / 1000);
            const result = await createEvent(fundFormData.title, amount, deadline, ipfsResult.ipfsHash);

            if (result.success) {
                toast.success('🎉 Funding event created!');
                setShowFundModal(false);
                setFundFormData({ title: '', description: '', amount: '', deadline: '' });
                const successMsg = { role: 'assistant', content: `✅ Funding Event Created!\n\n📋 ${fundFormData.title}\n💰 ${fundFormData.amount} SOL\n📅 Deadline: ${fundFormData.deadline}\n\nGo to Funding > Manage Events to view applications.`, timestamp: Date.now() };
                setMessages(prev => [...prev, successMsg]);
            } else {
                toast.error('Failed: ' + result.error);
            }
        } catch (error) {
            toast.error('Failed: ' + error.message);
        }
    };

    // 创建 Bill
    const handleCreateBill = async (billData) => {
        try {
            toast.info('Creating bill...');
            const result = await createGroupSplit({
                title: billData.reason,
                totalAmount: billData.amount,
                members: billData.friends.map(f => f.address),
                ipfsHash: 'QmDefault',
            });
            toast.success('📝 Bill created!');
            const successMsg = { role: 'assistant', content: `✅ Bill Created!\n\n📋 ${billData.reason}\n💰 ${billData.amount} SOL\n👥 ${billData.friends.map(f => '@' + f.username).join(', ')}\n\nView it in Bills > My Created Bills`, timestamp: Date.now() };
            setMessages(prev => [...prev, successMsg]);
        } catch (error) {
            toast.error('Failed: ' + error.message);
            const errorMsg = { role: 'assistant', content: `❌ Failed to create bill: ${error.message}`, timestamp: Date.now() };
            setMessages(prev => [...prev, errorMsg]);
        }
    };

    const handleCancelAction = () => {
        const cancelMsg = { role: 'assistant', content: '❌ Cancelled.', timestamp: Date.now() };
        setMessages(prev => [...prev, cancelMsg]);
    };

    // 执行转账
    const executeTransfer = async (amount, friend, reason, category = 'other') => {
        try {
            const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

            // 显示处理中消息
            const processingMsg = {
                role: 'assistant',
                content: `⏳ Processing transfer of ${amount} SOL to @${friend.username}...\n\nPlease approve the transaction in your wallet.`,
                timestamp: Date.now(),
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

            // 显示成功消息
            const successMsg = {
                role: 'assistant',
                content: `✅ Transfer successful!\n\n${amount} SOL sent to @${friend.username}\n\nTransaction: ${signature.slice(0, 8)}...${signature.slice(-8)}\n\nView on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
                timestamp: Date.now(),
                explorerLink: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
            };

            setMessages(prev => [...prev.filter(m => m.content !== processingMsg.content), successMsg]);

            // 记录消费到区块链
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
                role: 'assistant',
                content: `❌ Transfer failed: ${err.message}\n\nPlease try again or check your balance.`,
                timestamp: Date.now(),
            };

            setMessages(prev => [...prev, errorMsg]);
        }
    };

    const handleCancelTransfer = () => {
        const cancelMsg = { role: 'assistant', content: '❌ Transfer cancelled.', timestamp: Date.now() };
        setMessages(prev => [...prev, cancelMsg]);
    };

    return (
        <>
        <Card className="bg-neutral-900 border-neutral-800 flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-600 to-cyan-600 rounded-full p-2">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">AI Transfer Assistant</h3>
                    <p className="text-xs text-neutral-400">Powered by natural language processing</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                            }`}
                    >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                            ? 'bg-purple-600'
                            : 'bg-gradient-to-br from-cyan-600 to-purple-600'
                            }`}>
                            {message.role === 'user' ? (
                                <User className="h-4 w-4 text-white" />
                            ) : (
                                <Bot className="h-4 w-4 text-white" />
                            )}
                        </div>

                        {/* Message Content */}
                        <div className={`flex-1 ${message.role === 'user' ? 'text-right' : 'text-left'
                            }`}>
                            <div className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 ${message.role === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-800 text-neutral-100'
                                }`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>

                            {/* Category Selection */}
                            {message.action?.type === 'select-category' && (
                                <div className="mt-3">
                                    <div className="grid grid-cols-4 gap-2 max-w-md">
                                        {EXPENSE_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleCategorySelect(cat.id, message.action.data)}
                                                className="p-3 rounded-xl border-2 border-neutral-700 bg-neutral-800 hover:border-purple-500 hover:bg-neutral-700 transition-all duration-200 flex flex-col items-center gap-1 hover:scale-105"
                                            >
                                                <span className="text-2xl">{cat.emoji}</span>
                                                <span className="text-xs text-neutral-300 font-medium">{cat.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Confirm Transfer Buttons */}
                            {message.action?.type === 'confirm-transfer' && (
                                <div className="mt-2 flex gap-2">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => executeTransfer(message.action.data.amount, message.action.data.friend, message.action.data.reason, message.action.data.category)}>
                                        ✓ Confirm
                                    </Button>
                                    <Button size="sm" variant="outline" className="bg-neutral-700 hover:bg-neutral-600 border-neutral-600" onClick={handleCancelAction}>✗ Cancel</Button>
                                </div>
                            )}

                            {/* Confirm Create Fund Buttons */}
                            {message.action?.type === 'confirm-create-fund' && (
                                <div className="mt-2 flex gap-2">
                                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowFundModal(true)}>🎯 Create Fund</Button>
                                    <Button size="sm" variant="outline" className="bg-neutral-700 hover:bg-neutral-600 border-neutral-600" onClick={handleCancelAction}>✗ Cancel</Button>
                                </div>
                            )}

                            {/* Confirm Create Bill Buttons */}
                            {message.action?.type === 'confirm-create-bill' && (
                                <div className="mt-2 flex gap-2">
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleCreateBill(message.action.data)}>📝 Create Bill</Button>
                                    <Button size="sm" variant="outline" className="bg-neutral-700 hover:bg-neutral-600 border-neutral-600" onClick={handleCancelAction}>✗ Cancel</Button>
                                </div>
                            )}

                            {/* Explorer Link */}
                            {message.explorerLink && (
                                <div className="mt-2">
                                    <a
                                        href={message.explorerLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-cyan-400 hover:underline"
                                    >
                                        View on Solana Explorer →
                                    </a>
                                </div>
                            )}

                            <p className="text-xs text-neutral-500 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-neutral-800 rounded-2xl px-4 py-2">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-neutral-800">
                {!connected ? (
                    <div className="text-center text-neutral-400 py-2">
                        Connect your wallet to start chatting
                    </div>
                ) : (
                    <div className="space-y-3 relative">
                        {/* Mention suggestions dropdown */}
                        {showMentions && filteredFriends.length > 0 && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
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

                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                placeholder="Try: hello, create fund, create bill @user 1 SOL..."
                                className="flex-1 bg-neutral-800 border-neutral-700 text-white"
                                disabled={isProcessing}
                            />
                            <Button
                                onClick={() => handleSendMessage()}
                                disabled={!input.trim() || isProcessing}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex justify-center">
                            <VoiceInput
                                onTranscript={handleVoiceTranscript}
                                disabled={isProcessing}
                            />
                        </div>

                        <div className="text-xs text-neutral-500 text-center">
                            💡 Try: &quot;send 0.1 SOL to @username for coffee&quot; or use voice input
                        </div>
                    </div>
                )}
            </div>
        </Card>

        {/* Create Fund Modal */}
        <AnimatePresence>
            {showFundModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={() => setShowFundModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-5 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Create Funding Event</h2>
                                    <p className="text-white/80 text-sm">Set up a new funding pool</p>
                                </div>
                                <button onClick={() => setShowFundModal(false)} className="p-2 hover:bg-white/20 rounded-full"><X className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><FileText className="h-4 w-4 text-purple-500" />Event Title</label>
                                <input value={fundFormData.title} onChange={(e) => setFundFormData({...fundFormData, title: e.target.value})} placeholder="e.g., Community Scholarship" maxLength={64} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all outline-none" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                                <textarea value={fundFormData.description} onChange={(e) => setFundFormData({...fundFormData, description: e.target.value})} placeholder="Describe the purpose..." rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all outline-none resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><DollarSign className="h-4 w-4 text-purple-500" />Amount (SOL)</label>
                                    <input type="number" step="0.01" value={fundFormData.amount} onChange={(e) => setFundFormData({...fundFormData, amount: e.target.value})} placeholder="0.00" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all outline-none" />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><Calendar className="h-4 w-4 text-purple-500" />Deadline</label>
                                    <input type="date" value={fundFormData.deadline} onChange={(e) => setFundFormData({...fundFormData, deadline: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowFundModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700">Cancel</button>
                                <button onClick={handleCreateFund} disabled={isCreatingFund} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-medium disabled:opacity-50">
                                    {isCreatingFund ? 'Creating...' : 'Create Event'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
    );
}

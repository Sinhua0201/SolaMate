import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from '@/components/voice-input';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { useRecordExpense, ExpenseCategory } from '@/lib/solana/hooks/useExpenseProgram';

/**
 * AI Chat Interface Component
 * AI 聊天界面 - 支持文字和语音输入 + 实际转账功能
 */
export function AIChatInterface({ onTransferRequest }) {
    const { publicKey, connected, sendTransaction: walletSendTransaction } = useWallet();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi! I\'m your AI transfer assistant. You can say things like:\n• "Send 2 SOL to Alice for coffee"\n• "Transfer 0.5 SOL to Bob"\n• "Pay Charlie 1 SOL for lunch"',
            timestamp: Date.now(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [friends, setFriends] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { recordExpense } = useRecordExpense();

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

    // 解析转账指令
    const parseTransferCommand = (text) => {
        // 匹配模式: "send/transfer/pay [amount] SOL to [recipient] [for reason]"
        const patterns = [
            /(?:send|transfer|pay)\s+(\d+\.?\d*)\s+sol\s+to\s+@?(\w+)(?:\s+for\s+(.+))?/i,
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

    const handleSendMessage = async (messageText = input) => {
        if (!messageText.trim() || !connected) return;

        const userMessage = {
            role: 'user',
            content: messageText,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsProcessing(true);

        // 检查是否是转账命令
        const parsed = parseTransferCommand(messageText);

        if (parsed.isValid) {
            // 查找好友
            const friend = friends.find(f =>
                f.username.toLowerCase() === parsed.recipient.toLowerCase()
            );

            if (friend) {
                // 检查是否已经检测到分类
                if (parsed.category) {
                    // 已有分类，直接显示确认消息
                    const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === parsed.category);
                    const confirmMsg = {
                        role: 'assistant',
                        content: `💰 Transfer Request\n\nAmount: ${parsed.amount} SOL\nTo: @${friend.username} (${friend.displayName})\nCategory: ${categoryInfo?.emoji} ${categoryInfo?.name}\nReason: ${parsed.reason}\n\nReady to transfer?`,
                        timestamp: Date.now(),
                        action: {
                            type: 'confirm-transfer',
                            data: { amount: parsed.amount, friend, reason: parsed.reason, category: parsed.category },
                        }
                    };
                    setMessages(prev => [...prev, confirmMsg]);
                } else {
                    // 没有分类，显示分类选择消息
                    const categoryMsg = {
                        role: 'assistant',
                        content: `💰 Transfer Request\n\nAmount: ${parsed.amount} SOL\nTo: @${friend.username} (${friend.displayName})\n\nPlease select a category for this expense:`,
                        timestamp: Date.now(),
                        action: {
                            type: 'select-category',
                            data: { amount: parsed.amount, friend, reason: parsed.reason },
                        }
                    };
                    setMessages(prev => [...prev, categoryMsg]);
                }

                setIsProcessing(false);

                // 通知父组件
                if (onTransferRequest) {
                    onTransferRequest(parsed);
                }
            } else {
                // 好友不存在
                const errorMsg = {
                    role: 'assistant',
                    content: `❌ User @${parsed.recipient} not found in your friends list.\n\nMake sure they are your friend first!`,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, errorMsg]);
                setIsProcessing(false);
            }
        } else {
            // 普通对话
            setTimeout(() => {
                const assistantMessage = {
                    role: 'assistant',
                    content: 'I didn\'t quite understand that. Please try saying something like:\n• "Send 2 SOL to @Alice"\n• "Transfer 0.5 SOL to @Bob for dinner"\n\nMake sure to use @ before the username!',
                    timestamp: Date.now(),
                };

                setMessages(prev => [...prev, assistantMessage]);
                setIsProcessing(false);
            }, 1000);
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
        f.username.toLowerCase().includes(mentionSearch) ||
        f.displayName.toLowerCase().includes(mentionSearch)
    );

    // 处理分类选择
    const handleCategorySelect = (category, transferData) => {
        setSelectedCategory(category);

        // 显示确认消息
        const confirmMsg = {
            role: 'assistant',
            content: `✅ Category Selected: ${EXPENSE_CATEGORIES.find(c => c.id === category)?.emoji} ${EXPENSE_CATEGORIES.find(c => c.id === category)?.name}\n\n💰 Transfer Summary\n\nAmount: ${transferData.amount} SOL\nTo: @${transferData.friend.username} (${transferData.friend.displayName})\nCategory: ${EXPENSE_CATEGORIES.find(c => c.id === category)?.name}\nReason: ${transferData.reason}\n\nReady to transfer?`,
            timestamp: Date.now(),
            action: {
                type: 'confirm-transfer',
                data: { ...transferData, category },
            }
        };

        setMessages(prev => [...prev, confirmMsg]);
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
        const cancelMsg = {
            role: 'assistant',
            content: '❌ Transfer cancelled.',
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, cancelMsg]);
    };

    return (
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
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => executeTransfer(
                                            message.action.data.amount,
                                            message.action.data.friend,
                                            message.action.data.reason,
                                            message.action.data.category
                                        )}
                                    >
                                        ✓ Confirm Transfer
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-neutral-700 hover:bg-neutral-600 border-neutral-600"
                                        onClick={handleCancelTransfer}
                                    >
                                        ✗ Cancel
                                    </Button>
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
                                placeholder="Type or use voice input... (use @ to mention friends)"
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
                            💡 Try: "send 0.1 SOL to @username for coffee" or use voice input
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

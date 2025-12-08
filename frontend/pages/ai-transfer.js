import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { AIChatInterface } from '@/components/ai-chat-interface';
import { SocialGraph } from '@/components/social-graph';
import { GroupSplit } from '@/components/group-split';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, DollarSign, TrendingUp } from 'lucide-react';

/**
 * AI Transfer Page
 * 新功能展示页面 - AI 语音转账、社交图谱、群组 AA 制
 */
export default function AITransferPage() {
    const { publicKey, connected } = useWallet();
    const [activeTab, setActiveTab] = useState('ai-chat');
    const [transferRequest, setTransferRequest] = useState(null);

    // 模拟交易数据（实际应该从区块链获取）
    const mockTransactions = [
        { from: 'You', to: 'Alice', fromName: 'You', toName: 'Alice', amount: 2.5, timestamp: Date.now() },
        { from: 'You', to: 'Bob', fromName: 'You', toName: 'Bob', amount: 1.0, timestamp: Date.now() },
        { from: 'Alice', to: 'You', fromName: 'Alice', toName: 'You', amount: 0.5, timestamp: Date.now() },
        { from: 'You', to: 'Charlie', fromName: 'You', toName: 'Charlie', amount: 3.0, timestamp: Date.now() },
        { from: 'Bob', to: 'You', fromName: 'Bob', toName: 'You', amount: 1.5, timestamp: Date.now() },
    ];

    const handleTransferRequest = (request) => {
        setTransferRequest(request);
        console.log('Transfer request:', request);
    };

    const tabs = [
        { id: 'ai-chat', label: 'AI Transfer', icon: Sparkles },
        { id: 'social-graph', label: 'Social Network', icon: Users },
        { id: 'group-split', label: 'Group Split', icon: DollarSign },
    ];

    if (!connected) {
        return (
            <div className="min-h-screen bg-neutral-950">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <Card className="bg-neutral-900 border-neutral-800 p-8 text-center max-w-md">
                        <div className="relative w-32 h-32 mx-auto mb-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse" />
                            <div className="relative bg-gradient-to-br from-purple-600 to-cyan-600 rounded-full w-full h-full flex items-center justify-center">
                                <Sparkles className="h-16 w-16 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-3">Connect Your Wallet</h2>
                        <p className="text-neutral-400 text-lg">
                            Connect your wallet to access AI-powered transfer features!
                        </p>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-block mb-4 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full blur-2xl opacity-50 animate-pulse" />
                        <Sparkles className="relative h-16 w-16 text-purple-400" />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                        AI-Powered Transfers
                    </h1>
                    <p className="text-neutral-300 text-xl max-w-3xl mx-auto">
                        Transfer with voice commands, visualize your social network, and split bills effortlessly
                    </p>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border-purple-500/30 p-6 text-center">
                        <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">Voice Transfer</h3>
                        <p className="text-sm text-neutral-300">
                            Just say &quot;Send 2 SOL to Alice&quot; and we&apos;ll handle the rest
                        </p>
                    </Card>

                    <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/30 border-cyan-500/30 p-6 text-center">
                        <Users className="h-12 w-12 text-cyan-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">Social Graph</h3>
                        <p className="text-sm text-neutral-300">
                            Visualize your transaction network and discover patterns
                        </p>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-900/30 to-green-800/30 border-green-500/30 p-6 text-center">
                        <DollarSign className="h-12 w-12 text-green-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">Smart Split</h3>
                        <p className="text-sm text-neutral-300">
                            Split bills with friends and settle up with one click
                        </p>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-purple-600 to-cyan-600'
                                        : 'bg-neutral-800 hover:bg-neutral-700'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </Button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="mb-8">
                    {activeTab === 'ai-chat' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <AIChatInterface onTransferRequest={handleTransferRequest} />
                            </div>
                            <div>
                                <Card className="bg-neutral-900 border-neutral-800 p-6">
                                    <h3 className="text-lg font-bold text-white mb-4">How it works</h3>
                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                                1
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">Type or speak</p>
                                                <p className="text-sm text-neutral-400">
                                                    Use natural language to describe your transfer
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                                2
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">AI understands</p>
                                                <p className="text-sm text-neutral-400">
                                                    Our AI parses amount, recipient, and purpose
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                                3
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">Confirm & send</p>
                                                <p className="text-sm text-neutral-400">
                                                    Review and execute the transfer on Solana
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-neutral-800">
                                        <p className="text-sm text-neutral-400 mb-3">Try saying:</p>
                                        <div className="space-y-2">
                                            <div className="bg-neutral-800/50 rounded-lg p-2 text-sm text-neutral-300">
                                                &quot;Send 2 SOL to Alice for coffee&quot;
                                            </div>
                                            <div className="bg-neutral-800/50 rounded-lg p-2 text-sm text-neutral-300">
                                                &quot;Transfer 0.5 SOL to Bob&quot;
                                            </div>
                                            <div className="bg-neutral-800/50 rounded-lg p-2 text-sm text-neutral-300">
                                                &quot;Pay Charlie 1 SOL for lunch&quot;
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === 'social-graph' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <SocialGraph transactions={mockTransactions} />

                            <Card className="bg-neutral-900 border-neutral-800 p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Insights</h3>
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 rounded-lg p-4 border border-purple-500/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-5 w-5 text-purple-400" />
                                            <span className="text-white font-semibold">Most Active</span>
                                        </div>
                                        <p className="text-neutral-300">
                                            You&apos;ve transacted with <span className="text-purple-400 font-bold">Alice</span> the most this month
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-r from-cyan-900/30 to-cyan-800/30 rounded-lg p-4 border border-cyan-500/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="h-5 w-5 text-cyan-400" />
                                            <span className="text-white font-semibold">Network Growth</span>
                                        </div>
                                        <p className="text-neutral-300">
                                            Your network has grown by <span className="text-cyan-400 font-bold">3 contacts</span> this week
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 rounded-lg p-4 border border-green-500/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="h-5 w-5 text-green-400" />
                                            <span className="text-white font-semibold">Total Volume</span>
                                        </div>
                                        <p className="text-neutral-300">
                                            You&apos;ve transferred <span className="text-green-400 font-bold">7.5 SOL</span> in total
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-neutral-800">
                                    <h4 className="text-white font-semibold mb-3">Recommendations</h4>
                                    <div className="space-y-2">
                                        <div className="bg-neutral-800/50 rounded-lg p-3">
                                            <p className="text-sm text-neutral-300">
                                                💡 <span className="text-white">Bob</span> also transacts with Alice. Want to add them?
                                            </p>
                                        </div>
                                        <div className="bg-neutral-800/50 rounded-lg p-3">
                                            <p className="text-sm text-neutral-300">
                                                💡 You usually send to <span className="text-white">Alice</span> on Fridays. Set a reminder for next time?
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'group-split' && (
                        <GroupSplit />
                    )}
                </div>

                {/* Footer Info */}
                <Card className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border-purple-500/30 p-6 text-center">
                    <p className="text-neutral-300">
                        🚀 Built for <span className="text-purple-400 font-bold">Solana Student Hackathon 2025</span>
                    </p>
                    <p className="text-sm text-neutral-400 mt-2">
                        Powered by Solana&apos;s high-performance blockchain + AI natural language processing
                    </p>
                </Card>
            </div>
        </div>
    );
}

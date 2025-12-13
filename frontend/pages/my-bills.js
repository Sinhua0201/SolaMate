import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { SolanaConnectButton } from '@/components/solana-connect-button';
import { useUserGroupSplits } from '@/lib/solana/hooks/useGroupSplit';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function MyBillsPage() {
    const { publicKey } = useWallet();
    const router = useRouter();
    const { splits, loading, fetchSplits } = useUserGroupSplits();
    const [filter, setFilter] = useState('all'); // 'all', 'unpaid', 'paid'

    useEffect(() => {
        if (publicKey) {
            fetchSplits();
        }
    }, [publicKey]);

    // 只显示自己需要付款的账单（不是创建者的）
    const myBills = splits.filter(s => !s.isCreator);

    // 根据过滤器筛选
    const filteredBills = myBills.filter(bill => {
        if (filter === 'unpaid') return !bill.memberData?.paid;
        if (filter === 'paid') return bill.memberData?.paid;
        return true;
    });

    // 计算统计数据
    const totalUnpaid = myBills.filter(b => !b.memberData?.paid).length;
    const totalPaid = myBills.filter(b => b.memberData?.paid).length;
    const totalAmount = myBills
        .filter(b => !b.memberData?.paid)
        .reduce((sum, b) => sum + (b.account.amountPerPerson.toNumber() / LAMPORTS_PER_SOL), 0);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getPriorityColor = (daysAgo) => {
        if (daysAgo > 7) return 'text-red-600 bg-red-50';
        if (daysAgo > 3) return 'text-orange-600 bg-orange-50';
        return 'text-blue-600 bg-blue-50';
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                <Navbar />
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-xl">
                        <div className="text-6xl mb-4">💳</div>
                        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            My Bills
                        </h1>
                        <p className="text-gray-600 mb-8">Connect your wallet to view bills you need to pay</p>
                        <SolanaConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        💳 My Bills to Pay
                    </h1>
                    <p className="text-gray-600">Manage and track your pending payments</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm opacity-90">Unpaid Bills</span>
                            <span className="text-2xl">⏰</span>
                        </div>
                        <div className="text-3xl font-bold">{totalUnpaid}</div>
                        <div className="text-sm opacity-90 mt-1">Need attention</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm opacity-90">Total Amount</span>
                            <span className="text-2xl">💰</span>
                        </div>
                        <div className="text-3xl font-bold">{totalAmount.toFixed(3)}</div>
                        <div className="text-sm opacity-90 mt-1">SOL to pay</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm opacity-90">Paid Bills</span>
                            <span className="text-2xl">✅</span>
                        </div>
                        <div className="text-3xl font-bold">{totalPaid}</div>
                        <div className="text-sm opacity-90 mt-1">All settled</div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-3 mb-6 bg-white rounded-2xl p-2 shadow-sm">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${filter === 'all'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        📋 All ({myBills.length})
                    </button>
                    <button
                        onClick={() => setFilter('unpaid')}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${filter === 'unpaid'
                                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        ⏰ Unpaid ({totalUnpaid})
                    </button>
                    <button
                        onClick={() => setFilter('paid')}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${filter === 'paid'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        ✅ Paid ({totalPaid})
                    </button>
                </div>

                {/* Bills List */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading your bills...</p>
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm">
                        <div className="text-7xl mb-4">
                            {filter === 'unpaid' ? '🎉' : filter === 'paid' ? '✅' : '📭'}
                        </div>
                        <h2 className="text-2xl font-bold mb-2">
                            {filter === 'unpaid'
                                ? 'All caught up!'
                                : filter === 'paid'
                                    ? 'No paid bills yet'
                                    : 'No bills yet'}
                        </h2>
                        <p className="text-gray-600">
                            {filter === 'unpaid'
                                ? 'You have no pending bills to pay. Great job!'
                                : filter === 'paid'
                                    ? 'Paid bills will appear here.'
                                    : 'Bills you need to pay will appear here.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredBills.map((bill) => {
                            const isPaid = bill.memberData?.paid;
                            const amountToPay = bill.account.amountPerPerson.toNumber() / LAMPORTS_PER_SOL;
                            const createdDate = new Date(bill.account.createdAt * 1000);
                            const daysAgo = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
                            const priorityColor = getPriorityColor(daysAgo);

                            return (
                                <div
                                    key={bill.publicKey.toString()}
                                    onClick={() => router.push(`/group-split/${bill.publicKey.toString()}`)}
                                    className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer border-2 ${isPaid ? 'border-green-200' : 'border-purple-200 hover:border-purple-400'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-2xl font-bold">{bill.account.title}</h3>
                                                {!isPaid && daysAgo > 3 && (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityColor}`}>
                                                        {daysAgo > 7 ? '🔥 Urgent' : '⚠️ Due soon'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                <span>📅</span>
                                                <span>{formatDate(bill.account.createdAt)}</span>
                                            </p>
                                        </div>

                                        {isPaid ? (
                                            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold flex items-center gap-2">
                                                <span>✅</span>
                                                <span>Paid</span>
                                            </div>
                                        ) : (
                                            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-semibold flex items-center gap-2 animate-pulse">
                                                <span>⏰</span>
                                                <span>Unpaid</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className={`rounded-xl p-4 ${isPaid ? 'bg-green-50' : 'bg-gradient-to-br from-purple-50 to-pink-50'}`}>
                                            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                                <span>💵</span>
                                                <span>You need to pay</span>
                                            </p>
                                            <p className={`text-3xl font-bold ${isPaid ? 'text-green-600' : 'text-purple-600'}`}>
                                                {amountToPay.toFixed(4)} SOL
                                            </p>
                                        </div>
                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                                <span>👥</span>
                                                <span>Payment progress</span>
                                            </p>
                                            <p className="text-3xl font-bold text-blue-600">
                                                {bill.account.settledCount} / {bill.account.memberCount}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-600 font-medium">Overall Progress</span>
                                            <span className="text-sm font-bold text-purple-600">
                                                {Math.round((bill.account.settledCount / bill.account.memberCount) * 100)}%
                                            </span>
                                        </div>
                                        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(bill.account.settledCount / bill.account.memberCount) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/group-split/${bill.publicKey.toString()}`);
                                        }}
                                        className={`w-full py-3 rounded-xl font-semibold transition-all ${isPaid
                                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-[1.02]'
                                            }`}
                                    >
                                        {isPaid ? '📄 View Details' : '💳 Pay Now'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

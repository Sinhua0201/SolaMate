import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { SolanaConnectButton } from '@/components/solana-connect-button';
import { useUserGroupSplits } from '@/lib/solana/hooks/useGroupSplit';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function BillsHistoryPage() {
    const { publicKey } = useWallet();
    const router = useRouter();
    const { splits, loading, fetchSplits } = useUserGroupSplits();
    const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'status'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

    useEffect(() => {
        if (publicKey) {
            fetchSplits();
        }
    }, [publicKey]);

    // 所有账单历史（包括创建的和参与的）
    const allBills = splits.map(bill => ({
        ...bill,
        role: bill.isCreator ? 'creator' : 'member',
        isPaid: bill.isCreator ? true : bill.memberData?.paid,
        amount: bill.isCreator
            ? bill.account.totalAmount.toNumber() / LAMPORTS_PER_SOL
            : bill.account.amountPerPerson.toNumber() / LAMPORTS_PER_SOL,
        date: bill.account.createdAt,
    }));

    // 排序
    const sortedBills = [...allBills].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'date') {
            comparison = a.date - b.date;
        } else if (sortBy === 'amount') {
            comparison = a.amount - b.amount;
        } else if (sortBy === 'status') {
            comparison = (a.isPaid ? 1 : 0) - (b.isPaid ? 1 : 0);
        }
        return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 统计数据
    const stats = {
        totalBills: allBills.length,
        asCreator: allBills.filter(b => b.role === 'creator').length,
        asMember: allBills.filter(b => b.role === 'member').length,
        totalPaid: allBills.filter(b => b.role === 'member' && b.isPaid)
            .reduce((sum, b) => sum + b.amount, 0),
        totalReceived: allBills.filter(b => b.role === 'creator')
            .reduce((sum, b) => sum + (b.account.settledCount * b.account.amountPerPerson.toNumber() / LAMPORTS_PER_SOL), 0),
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusInfo = (bill) => {
        if (bill.role === 'creator') {
            const progress = bill.account.settledCount / bill.account.memberCount;
            if (progress === 1) return { label: 'Fully Collected', color: 'bg-green-100 text-green-700', icon: '✅' };
            if (progress > 0) return { label: 'Partially Collected', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' };
            return { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: '📋' };
        } else {
            if (bill.isPaid) return { label: 'Paid', color: 'bg-green-100 text-green-700', icon: '✅' };
            return { label: 'Unpaid', color: 'bg-red-100 text-red-700', icon: '⏰' };
        }
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <Navbar />
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-xl">
                        <div className="text-6xl mb-4">📜</div>
                        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Payment History
                        </h1>
                        <p className="text-gray-600 mb-8">Connect your wallet to view your payment history</p>
                        <SolanaConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        📜 Payment History
                    </h1>
                    <p className="text-gray-600">Complete record of all your bills and payments</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200">
                        <div className="text-3xl mb-2">📊</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.totalBills}</div>
                        <div className="text-sm text-gray-500">Total Bills</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200">
                        <div className="text-3xl mb-2">👑</div>
                        <div className="text-3xl font-bold text-purple-600">{stats.asCreator}</div>
                        <div className="text-sm text-gray-500">Created by You</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200">
                        <div className="text-3xl mb-2">👤</div>
                        <div className="text-3xl font-bold text-blue-600">{stats.asMember}</div>
                        <div className="text-sm text-gray-500">As Member</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200">
                        <div className="text-3xl mb-2">💰</div>
                        <div className="text-3xl font-bold text-green-600">{stats.totalPaid.toFixed(3)}</div>
                        <div className="text-sm text-gray-500">SOL Paid</div>
                    </div>
                </div>

                {/* Sort Controls */}
                <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-200 mb-6 flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">Sort by:</span>
                    <div className="flex gap-2">
                        {[
                            { value: 'date', label: '📅 Date' },
                            { value: 'amount', label: '💵 Amount' },
                            { value: 'status', label: '📊 Status' },
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setSortBy(option.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${sortBy === option.value
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                    >
                        {sortOrder === 'desc' ? '⬇️ Newest First' : '⬆️ Oldest First'}
                    </button>
                </div>

                {/* Bills List */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading history...</p>
                    </div>
                ) : sortedBills.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-md border border-gray-200">
                        <div className="text-7xl mb-4">📭</div>
                        <h2 className="text-2xl font-bold mb-2">No History Yet</h2>
                        <p className="text-gray-600 mb-6">Your payment history will appear here.</p>
                        <button
                            onClick={() => router.push('/create-group-split')}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition-all"
                        >
                            Create Your First Bill
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-sm font-semibold text-gray-600">
                            <div className="col-span-4">Bill</div>
                            <div className="col-span-2">Role</div>
                            <div className="col-span-2">Amount</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Date</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-gray-100">
                            {sortedBills.map((bill) => {
                                const statusInfo = getStatusInfo(bill);

                                return (
                                    <div
                                        key={bill.publicKey.toString()}
                                        onClick={() => router.push(`/group-split/${bill.publicKey.toString()}`)}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-blue-50/50 cursor-pointer transition-all"
                                    >
                                        {/* Bill Info */}
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${bill.role === 'creator' ? 'bg-purple-100' : 'bg-blue-100'
                                                }`}>
                                                {bill.role === 'creator' ? '👑' : '💳'}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-800">{bill.account.title}</h3>
                                                <p className="text-xs text-gray-500">
                                                    {bill.account.settledCount}/{bill.account.memberCount} paid
                                                </p>
                                            </div>
                                        </div>

                                        {/* Role */}
                                        <div className="col-span-2 flex items-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${bill.role === 'creator'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {bill.role === 'creator' ? '👑 Creator' : '👤 Member'}
                                            </span>
                                        </div>

                                        {/* Amount */}
                                        <div className="col-span-2 flex items-center">
                                            <span className="font-bold text-gray-800">
                                                {bill.amount.toFixed(4)} SOL
                                            </span>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2 flex items-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                                                <span>{statusInfo.icon}</span>
                                                <span>{statusInfo.label}</span>
                                            </span>
                                        </div>

                                        {/* Date */}
                                        <div className="col-span-2 flex items-center text-sm text-gray-500">
                                            {formatDate(bill.date)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

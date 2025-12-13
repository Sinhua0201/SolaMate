import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { SolanaConnectButton } from '@/components/solana-connect-button';
import { useUserGroupSplits } from '@/lib/solana/hooks/useGroupSplit';
import { CreateBillModal } from '@/components/create-bill-modal';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function GroupSplitsPage() {
    const { publicKey } = useWallet();
    const router = useRouter();
    const { splits, loading, fetchSplits } = useUserGroupSplits();
    const [activeTab, setActiveTab] = useState('created'); // 'created' or 'toPay'
    const [isCreateBillOpen, setIsCreateBillOpen] = useState(false);

    useEffect(() => {
        if (publicKey) {
            fetchSplits();
        }
    }, [publicKey]);

    const getStatusBadge = (status) => {
        const statusMap = {
            0: { label: 'Active', color: 'bg-blue-500', icon: '⏳' },
            1: { label: 'Settled', color: 'bg-green-500', icon: '✅' },
            2: { label: 'Closed', color: 'bg-gray-500', icon: '🔒' },
        };
        const s = statusMap[status] || statusMap[0];
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${s.color}`}>
                <span>{s.icon}</span>
                <span>{s.label}</span>
            </span>
        );
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // 分类账单
    const createdSplits = splits.filter(s => s.isCreator);
    const toPaySplits = splits.filter(s => !s.isCreator && !s.memberData?.paid);

    const displaySplits = activeTab === 'created' ? createdSplits : toPaySplits;

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar />
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-md mx-auto text-center">
                        <h1 className="text-3xl font-bold mb-4">My Bills</h1>
                        <p className="text-gray-600 mb-8">Please connect your wallet to view your bills</p>
                        <SolanaConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">My Bills</h1>
                    <button
                        onClick={() => setIsCreateBillOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all"
                    >
                        + Create New Bill
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-white rounded-2xl p-2 shadow-md border border-gray-200">
                    <button
                        onClick={() => setActiveTab('created')}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'created'
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        👑 Created by Me ({createdSplits.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('toPay')}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'toPay'
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        💰 Need to Pay ({toPaySplits.length})
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                ) : displaySplits.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📋</div>
                        <h2 className="text-xl font-semibold mb-2">
                            {activeTab === 'created' ? 'No bills created yet' : 'No bills to pay'}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {activeTab === 'created'
                                ? 'Create your first bill to split expenses with friends!'
                                : 'You have no pending bills to pay.'}
                        </p>
                        {activeTab === 'created' && (
                            <button
                                onClick={() => setIsCreateBillOpen(true)}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all"
                            >
                                Create Bill
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displaySplits.map((split) => {
                            const isCreator = split.isCreator;
                            const isPaid = split.memberData?.paid;
                            const amountPerPerson = split.account.amountPerPerson.toNumber() / LAMPORTS_PER_SOL;

                            return (
                                <div
                                    key={split.publicKey.toString()}
                                    onClick={() => router.push(`/group-split/${split.publicKey.toString()}`)}
                                    className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-semibold mb-2">{split.account.title}</h3>
                                            <p className="text-sm text-gray-500">
                                                Created on {formatDate(split.account.createdAt)}
                                            </p>
                                        </div>
                                        {getStatusBadge(Object.keys(split.account.status)[0])}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                                            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                                            <p className="text-2xl font-bold text-purple-600">
                                                {(split.account.totalAmount.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                                            <p className="text-sm text-gray-600 mb-1">{isCreator ? 'Per Person' : 'You Need to Pay'}</p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {amountPerPerson.toFixed(4)} SOL
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600">
                                                {split.account.settledCount} / {split.account.memberCount} paid
                                            </span>
                                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-32">
                                                <div
                                                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${(split.account.settledCount / split.account.memberCount) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {isCreator ? (
                                            <span className="text-blue-600 font-medium flex items-center gap-1">
                                                <span>👑</span>
                                                <span>Creator</span>
                                            </span>
                                        ) : isPaid ? (
                                            <span className="text-green-600 font-medium flex items-center gap-1">
                                                <span>✅</span>
                                                <span>Paid</span>
                                            </span>
                                        ) : (
                                            <span className="text-orange-600 font-medium flex items-center gap-1">
                                                <span>⏳</span>
                                                <span>Pending</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Bill Modal */}
            <CreateBillModal isOpen={isCreateBillOpen} onClose={() => setIsCreateBillOpen(false)} />
        </div>
    );
}

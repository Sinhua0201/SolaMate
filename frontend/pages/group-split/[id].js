import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { SolanaConnectButton } from '@/components/solana-connect-button';
import { useGroupSplitDetails, useMarkSplitPaid } from '@/lib/solana/hooks/useGroupSplit';
import { getProfileFromChain } from '@/lib/solana/profileHelper';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';
import { User } from 'lucide-react';

const getAvatarPath = (name) => name ? `/avatar/${name}` : null;

export default function GroupSplitDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const wallet = useWallet();
    const { publicKey, sendTransaction } = wallet;
    const { details, loading, fetchDetails } = useGroupSplitDetails(id);
    const { markPaid, loading: markingPaid } = useMarkSplitPaid();
    const [refreshKey, setRefreshKey] = useState(0);
    const [ipfsData, setIpfsData] = useState(null);
    const [loadingIpfs, setLoadingIpfs] = useState(false);
    const [memberProfiles, setMemberProfiles] = useState({});

    useEffect(() => {
        if (id && publicKey) {
            fetchDetails();
        }
    }, [id, publicKey, refreshKey]);

    // 获取成员个人资料
    useEffect(() => {
        if (details?.members) {
            fetchMemberProfiles();
        }
    }, [details]);

    const fetchMemberProfiles = async () => {
        const profiles = {};
        for (const member of details.members) {
            try {
                const memberAddress = member.account.member.toString();
                const result = await getProfileFromChain(memberAddress);
                if (result.success && result.exists) {
                    profiles[memberAddress] = result.profile;
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        }
        setMemberProfiles(profiles);
    };

    // 获取 IPFS 数据
    useEffect(() => {
        if (details?.data?.ipfsHash && details.data.ipfsHash !== 'QmDefault') {
            fetchIpfsData(details.data.ipfsHash);
        }
    }, [details]);

    const fetchIpfsData = async (hash) => {
        // Skip if hash looks invalid
        if (!hash || hash.length < 10 || hash === 'QmDefault') {
            return;
        }

        setLoadingIpfs(true);
        try {
            // Try multiple IPFS gateways
            const gateways = [
                `https://gateway.pinata.cloud/ipfs/${hash}`,
                `https://ipfs.io/ipfs/${hash}`,
                `https://cloudflare-ipfs.com/ipfs/${hash}`,
            ];

            let data = null;
            for (const gateway of gateways) {
                try {
                    const response = await fetch(gateway, {
                        signal: AbortSignal.timeout(5000) // 5 second timeout
                    });
                    if (response.ok) {
                        data = await response.json();
                        break;
                    }
                } catch {
                    continue; // Try next gateway
                }
            }

            if (data) {
                setIpfsData(data);
            }
        } catch (err) {
            console.error('Failed to fetch IPFS data:', err);
            // Don't show error to user, just silently fail
        } finally {
            setLoadingIpfs(false);
        }
    };

    const handleMarkPaid = async (memberAddress) => {
        if (!publicKey || !sendTransaction || !details) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            const { data } = details;
            const amountPerPerson = data.amountPerPerson.toNumber() / LAMPORTS_PER_SOL;

            const confirmed = window.confirm(
                `Confirm payment of ${amountPerPerson.toFixed(4)} SOL to the creator?\n\nPayment will be automatically marked as paid after successful transfer.`
            );

            if (!confirmed) return;

            const { Connection, PublicKey, SystemProgram, Transaction } = await import('@solana/web3.js');
            const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

            const recipientPubkey = new PublicKey(data.creator);
            const lamports = Math.floor(amountPerPerson * LAMPORTS_PER_SOL);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: recipientPubkey,
                    lamports,
                })
            );

            toast.info('Please confirm the transfer in your wallet...');

            const signature = await sendTransaction(transaction, connection);

            toast.info('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            toast.success('Transfer successful! Marking payment status...');

            await markPaid(id, memberAddress);

            toast.success('Payment complete!');
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            console.error('Payment error:', err);
            toast.error('Payment failed: ' + err.message);
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatAddress = (address) => {
        const str = address.toString();
        return `${str.slice(0, 4)}...${str.slice(-4)}`;
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            0: { label: 'Active', color: 'bg-blue-500', icon: '⏳' },
            1: { label: 'Settled', color: 'bg-green-500', icon: '✅' },
            2: { label: 'Closed', color: 'bg-gray-500', icon: '🔒' },
        };
        const s = statusMap[status] || statusMap[0];
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white ${s.color}`}>
                <span>{s.icon}</span>
                <span>{s.label}</span>
            </span>
        );
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar />
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-md mx-auto text-center">
                        <h1 className="text-3xl font-bold mb-4">Bill Details</h1>
                        <p className="text-gray-600 mb-8">Please connect your wallet to view bill details</p>
                        <SolanaConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    if (loading || !details) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar />
                <div className="container mx-auto px-4 py-20">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    const { data, members } = details;
    const totalAmount = data.totalAmount.toNumber() / LAMPORTS_PER_SOL;
    const amountPerPerson = data.amountPerPerson.toNumber() / LAMPORTS_PER_SOL;
    const statusKey = Object.keys(data.status)[0];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <button
                    onClick={() => router.back()}
                    className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
                >
                    <span>←</span>
                    <span>Back</span>
                </button>

                {/* Bill Header */}
                <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
                            <p className="text-gray-500">Created on {formatDate(data.createdAt)}</p>
                        </div>
                        {getStatusBadge(statusKey)}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <p className="text-sm text-gray-600 mb-2">Total Amount</p>
                            <p className="text-3xl font-bold text-purple-600">{totalAmount.toFixed(2)}</p>
                            <p className="text-sm text-gray-500 mt-1">SOL</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <p className="text-sm text-gray-600 mb-2">Per Person</p>
                            <p className="text-3xl font-bold text-purple-600">{amountPerPerson.toFixed(2)}</p>
                            <p className="text-sm text-gray-500 mt-1">SOL</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                            <p className="text-sm text-gray-600 mb-2">Payment Progress</p>
                            <p className="text-3xl font-bold text-blue-600">
                                {data.settledCount}/{data.memberCount}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Paid</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">Completion</span>
                            <span className="text-sm font-semibold text-gray-900">
                                {Math.round((data.settledCount / data.memberCount) * 100)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
                                style={{
                                    width: `${(data.settledCount / data.memberCount) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-6">👥 Member Payment Status</h2>

                    <div className="space-y-4">
                        {members.map((member) => {
                            const memberPubkey = member.account.member.toString();
                            const isCurrentUser = memberPubkey === publicKey.toString();
                            const isPaid = member.account.paid;
                            const paidAt = member.account.paidAt;
                            const profile = memberProfiles[memberPubkey];

                            return (
                                <div
                                    key={memberPubkey}
                                    className={`border-2 rounded-xl p-6 transition-all ${isCurrentUser
                                        ? 'border-purple-300 bg-white'
                                        : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Avatar */}
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center overflow-hidden shadow-md flex-shrink-0">
                                                {profile?.avatar ? (
                                                    <img
                                                        src={getAvatarPath(profile.avatar)}
                                                        alt={profile.displayName || profile.username}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="h-8 w-8 text-white" />
                                                )}
                                            </div>

                                            {/* User Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-xl text-gray-800">
                                                        {profile?.displayName || profile?.username || 'Anonymous'}
                                                    </p>
                                                    {isCurrentUser && (
                                                        <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 font-mono mb-2">
                                                    {formatAddress(memberPubkey)}
                                                </p>
                                                <p className="text-gray-600">
                                                    Amount Due: <span className="font-bold text-lg text-purple-600">{amountPerPerson.toFixed(4)} SOL</span>
                                                </p>
                                                {isPaid && paidAt > 0 && (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Paid on: {formatDate(paidAt)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {isPaid ? (
                                                    <div className="text-center">
                                                        <div className="text-4xl mb-1">✅</div>
                                                        <p className="text-green-600 font-semibold">Paid</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="text-4xl mb-1">⏳</div>
                                                        <p className="text-orange-600 font-semibold">Pending</p>
                                                    </div>
                                                )}

                                                {isCurrentUser && !isPaid && (
                                                    <button
                                                        onClick={() => handleMarkPaid(memberPubkey)}
                                                        disabled={markingPaid}
                                                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                    >
                                                        {markingPaid ? 'Processing...' : 'Pay Now'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bill Information Card */}
                <div className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-md border-2 border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">📋</span>
                        <h3 className="text-xl font-bold text-gray-800">Bill Information</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Creator:</p>
                            <p className="font-mono text-gray-800 font-semibold">{formatAddress(data.creator)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Bill Address:</p>
                            <p className="font-mono text-gray-800 font-semibold break-all">{id}</p>
                        </div>
                        {data.ipfsHash && data.ipfsHash !== 'QmDefault' && (
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <p className="text-sm text-gray-500 mb-1">IPFS Hash:</p>
                                <p className="font-mono text-gray-800 font-semibold break-all">{data.ipfsHash}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* IPFS Data Display */}
                {loadingIpfs && (
                    <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                        <p className="mt-2 text-gray-600">Loading bill details...</p>
                    </div>
                )}

                {ipfsData && (
                    <div className="mt-6 bg-white rounded-2xl p-6 shadow-md border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📄</span>
                            <h3 className="text-xl font-bold text-gray-800">Receipt Details</h3>
                        </div>

                        {/* Receipt Photo */}
                        {ipfsData.imageHash && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Receipt Photo:</p>
                                <img
                                    src={`https://gateway.pinata.cloud/ipfs/${ipfsData.imageHash}`}
                                    alt="Receipt"
                                    className="w-full max-h-96 object-contain rounded-xl border-2 border-purple-200 shadow-lg"
                                />
                            </div>
                        )}

                        {/* OCR Recognition Result */}
                        {ipfsData.ocrResult && (
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <p className="font-semibold text-gray-800 mb-3">Scanned Content:</p>
                                <div className="space-y-2 text-sm">
                                    {ipfsData.ocrResult.storeName && (
                                        <div className="flex justify-between py-2 border-b border-gray-100">
                                            <span className="text-gray-600">Store:</span>
                                            <span className="font-semibold text-gray-800">{ipfsData.ocrResult.storeName}</span>
                                        </div>
                                    )}
                                    {ipfsData.ocrResult.date && (
                                        <div className="flex justify-between py-2 border-b border-gray-100">
                                            <span className="text-gray-600">Date:</span>
                                            <span className="font-semibold text-gray-800">{ipfsData.ocrResult.date}</span>
                                        </div>
                                    )}
                                    {ipfsData.ocrResult.items && ipfsData.ocrResult.items.length > 0 && (
                                        <div className="py-2">
                                            <p className="text-gray-600 mb-2">Items:</p>
                                            <div className="space-y-1 ml-2">
                                                {ipfsData.ocrResult.items.map((item, i) => (
                                                    <div key={i} className="flex justify-between text-gray-700">
                                                        <span>• {item.name}</span>
                                                        <span className="font-semibold">{item.price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {ipfsData.ocrResult.total && (
                                        <div className="flex justify-between py-2 border-t-2 border-purple-200 mt-2">
                                            <span className="text-gray-800 font-semibold">Total:</span>
                                            <span className="font-bold text-purple-600 text-lg">
                                                {ipfsData.ocrResult.total} {ipfsData.ocrResult.currency || ''}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Created Time */}
                        {ipfsData.createdAt && (
                            <div className="mt-4 text-sm text-gray-500 text-center">
                                Created: {new Date(ipfsData.createdAt).toLocaleString('en-US')}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

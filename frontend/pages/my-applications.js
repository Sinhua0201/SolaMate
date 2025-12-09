import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '@/lib/solana/anchorSetup';
import { Navbar } from '@/components/navbar';

// Import WalletMultiButton dynamically to avoid SSR issues
const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function MyApplicationsPage() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (publicKey) {
            loadMyApplications();
        }
    }, [publicKey]);

    const loadMyApplications = async () => {
        try {
            setLoading(true);
            const program = getProgram(wallet);

            // Get all my applications
            const allApps = await program.account.application.all([
                {
                    memcmp: {
                        offset: 8 + 32, // discriminator + event pubkey
                        bytes: publicKey.toBase58(),
                    }
                }
            ]);

            // Get event info for each application
            const appsWithEvents = await Promise.all(
                allApps.map(async (app) => {
                    try {
                        const event = await program.account.fundingEvent.fetch(app.account.event);
                        return {
                            ...app,
                            eventData: event
                        };
                    } catch (error) {
                        console.error('Failed to fetch event info:', error);
                        return {
                            ...app,
                            eventData: null
                        };
                    }
                })
            );

            setApplications(appsWithEvents);
        } catch (error) {
            console.error('Failed to load applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatSOL = (lamports) => {
        return (lamports / 1e9).toFixed(4);
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString('en-US');
    };

    const getStatusText = (status) => {
        if (status.pending) return 'Pending';
        if (status.approved) return 'Approved';
        if (status.rejected) return 'Rejected';
        if (status.paid) return 'Paid';
        return 'Unknown';
    };

    const getStatusColor = (status) => {
        if (status.pending) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        if (status.approved) return 'bg-green-100 text-green-800 border-green-300';
        if (status.rejected) return 'bg-red-100 text-red-800 border-red-300';
        if (status.paid) return 'bg-blue-100 text-blue-800 border-blue-300';
        return 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getStatusIcon = (status) => {
        if (status.pending) return '⏳';
        if (status.approved) return '✅';
        if (status.rejected) return '❌';
        if (status.paid) return '💰';
        return '❓';
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />

                <div className="text-center relative z-10">
                    <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">My Applications</h1>
                    <p className="text-neutral-600 mb-6">Please connect your wallet</p>
                    <WalletMultiButton />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />

            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                            My Applications
                        </span>
                    </h1>
                    <p className="text-neutral-600">Track your funding application status</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-neutral-600">Loading...</p>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-lg shadow border border-purple-200">
                        <p className="text-neutral-600 mb-4">You haven't submitted any applications yet</p>
                        <a
                            href="/funding-apply"
                            className="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:from-purple-700 hover:to-cyan-700"
                        >
                            Apply for Funding
                        </a>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {applications.map((app) => (
                            <div
                                key={app.publicKey.toString()}
                                className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-purple-100"
                            >
                                {/* Status Badge */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-800">
                                            {app.eventData?.title || 'Event Closed'}
                                        </h3>
                                        <p className="text-sm text-neutral-500 mt-1">
                                            Applied: {formatDate(app.account.appliedAt)}
                                        </p>
                                    </div>
                                    <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(app.account.status)}`}>
                                        {getStatusIcon(app.account.status)} {getStatusText(app.account.status)}
                                    </span>
                                </div>

                                {/* Amount Info */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                        <p className="text-sm text-neutral-600 mb-1">Requested Amount</p>
                                        <p className="text-lg font-bold text-purple-600">
                                            {formatSOL(app.account.requestedAmount)} SOL
                                        </p>
                                    </div>

                                    {app.account.approvedAmount > 0 && (
                                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                            <p className="text-sm text-neutral-600 mb-1">Approved Amount</p>
                                            <p className="text-lg font-bold text-green-600">
                                                {formatSOL(app.account.approvedAmount)} SOL
                                            </p>
                                        </div>
                                    )}

                                    {app.eventData && (
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                            <p className="text-sm text-neutral-600 mb-1">Event Remaining</p>
                                            <p className="text-lg font-bold text-blue-600">
                                                {formatSOL(app.eventData.remainingAmount)} SOL
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Application Details */}
                                <div className="border-t border-purple-100 pt-4">
                                    <p className="text-sm text-neutral-600">
                                        <span className="font-semibold">Application ID:</span>{' '}
                                        <span className="font-mono text-xs">
                                            {app.publicKey.toString()}
                                        </span>
                                    </p>
                                    {app.account.ipfsHash && (
                                        <p className="text-sm text-neutral-600 mt-1">
                                            <span className="font-semibold">IPFS:</span>{' '}
                                            <a
                                                href={`https://gateway.pinata.cloud/ipfs/${app.account.ipfsHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-600 hover:underline"
                                            >
                                                View Details
                                            </a>
                                        </p>
                                    )}
                                </div>

                                {/* Status Messages */}
                                {app.account.status.pending && (
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            ⏳ Your application is under review, please be patient...
                                        </p>
                                    </div>
                                )}

                                {app.account.status.approved && (
                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-800">
                                            ✅ Congratulations! Your application has been approved, awaiting fund disbursement...
                                        </p>
                                    </div>
                                )}

                                {app.account.status.rejected && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-800">
                                            ❌ Sorry, your application was not approved
                                        </p>
                                    </div>
                                )}

                                {app.account.status.paid && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            💰 Funds have been disbursed to your wallet!
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

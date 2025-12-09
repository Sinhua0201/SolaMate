import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '@/lib/solana/anchorSetup';
import { Navbar } from '@/components/navbar';

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

            const allApps = await program.account.application.all([
                { memcmp: { offset: 8 + 32, bytes: publicKey.toBase58() } }
            ]);

            const appsWithEvents = await Promise.all(
                allApps.map(async (app) => {
                    try {
                        const event = await program.account.fundingEvent.fetch(app.account.event);
                        return { ...app, eventData: event };
                    } catch (error) {
                        return { ...app, eventData: null };
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

    const formatSOL = (lamports) => (lamports / 1e9).toFixed(4);
    const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleDateString('en-US');

    const getStatusConfig = (status) => {
        if (status.pending) return { text: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '⏳', message: 'Your application is under review' };
        if (status.approved) return { text: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', icon: '✅', message: 'Approved! Awaiting disbursement' };
        if (status.rejected) return { text: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: '❌', message: 'Application was not approved' };
        if (status.paid) return { text: 'Paid', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '💰', message: 'Funds sent to your wallet!' };
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '❓', message: '' };
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />
                <div className="text-center relative z-10">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-[28px] flex items-center justify-center shadow-[0_10px_40px_rgb(124,58,237,0.3)]">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">My Applications</h1>
                    <p className="text-neutral-500 mb-6">Please connect your wallet to continue</p>
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
                <div className="text-center mb-10">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(124,58,237,0.25)]">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">My Applications</span>
                    </h1>
                    <p className="text-neutral-500 text-lg">Track your funding application status</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-neutral-500">Loading...</p>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-neutral-600 text-lg mb-2">No Applications Yet</p>
                        <p className="text-neutral-400 text-sm mb-6">You haven't submitted any applications</p>
                        <a
                            href="/funding-apply"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-2xl font-medium shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-cyan-700 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Apply for Funding
                        </a>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100 overflow-hidden">
                        {applications.map((app, index) => {
                            const statusConfig = getStatusConfig(app.account.status);
                            return (
                                <div
                                    key={app.publicKey.toString()}
                                    className={`p-5 hover:bg-purple-50/30 transition-colors ${index !== applications.length - 1 ? 'border-b-2 border-purple-50' : ''}`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Title & Status */}
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <h3 className="font-semibold text-neutral-800 truncate">
                                                    {app.eventData?.title || 'Event Closed'}
                                                </h3>
                                                <span className={`px-3 py-1 text-xs font-medium rounded-full border flex-shrink-0 ${statusConfig.color}`}>
                                                    {statusConfig.icon} {statusConfig.text}
                                                </span>
                                            </div>

                                            {/* Amount Info */}
                                            <div className="flex items-center gap-4 text-sm mb-2">
                                                <div>
                                                    <span className="text-neutral-500">Requested: </span>
                                                    <span className="font-semibold text-purple-600">{formatSOL(app.account.requestedAmount)} SOL</span>
                                                </div>
                                                {app.account.approvedAmount > 0 && (
                                                    <>
                                                        <span className="text-neutral-300">→</span>
                                                        <div>
                                                            <span className="text-neutral-500">Approved: </span>
                                                            <span className="font-semibold text-green-600">{formatSOL(app.account.approvedAmount)} SOL</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Date & Link */}
                                            <div className="flex items-center gap-3 text-sm text-neutral-500">
                                                <span>{formatDate(app.account.appliedAt)}</span>
                                                {app.account.ipfsHash && (
                                                    <>
                                                        <span className="text-neutral-300">•</span>
                                                        <a
                                                            href={`https://gateway.pinata.cloud/ipfs/${app.account.ipfsHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-purple-600 hover:text-purple-700 font-medium"
                                                        >
                                                            View Details →
                                                        </a>
                                                    </>
                                                )}
                                            </div>

                                            {/* Status Message */}
                                            {statusConfig.message && (
                                                <div className={`mt-3 px-3 py-2 rounded-xl text-sm ${
                                                    app.account.status.pending ? 'bg-amber-50 text-amber-700' :
                                                    app.account.status.approved ? 'bg-green-50 text-green-700' :
                                                    app.account.status.rejected ? 'bg-red-50 text-red-700' :
                                                    app.account.status.paid ? 'bg-blue-50 text-blue-700' : ''
                                                }`}>
                                                    {statusConfig.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

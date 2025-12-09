import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '@/lib/solana/anchorSetup';
import { useApproveApplication, useDisburseFunds } from '@/lib/solana/hooks/useFundingProgram';
import { Navbar } from '@/components/navbar';
import { toast } from 'sonner';

const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function FundingManagePage() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [myEvents, setMyEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [approveAmount, setApproveAmount] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [disburseApp, setDisburseApp] = useState(null); // For disburse confirmation modal
    const [applicantProfiles, setApplicantProfiles] = useState({}); // Cache for applicant profiles

    const { approveApplication, isLoading: isApproving } = useApproveApplication();
    const { disburseFunds, isLoading: isDisbursing } = useDisburseFunds();

    // Helper to get avatar path
    const getAvatarPath = (avatarName) => avatarName ? `/avatar/${avatarName}` : null;

    useEffect(() => {
        if (publicKey) {
            loadMyEvents();
        }
    }, [publicKey]);

    useEffect(() => {
        if (selectedEvent) {
            loadApplications(selectedEvent.publicKey);
        }
    }, [selectedEvent]);

    const loadMyEvents = async () => {
        try {
            setLoading(true);
            const program = getProgram(wallet);
            const allEvents = await program.account.fundingEvent.all([
                { memcmp: { offset: 8, bytes: publicKey.toBase58() } }
            ]);
            setMyEvents(allEvents);
            if (allEvents.length > 0) setSelectedEvent(allEvents[0]);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadApplications = async (eventPDA) => {
        try {
            const program = getProgram(wallet);
            const allApps = await program.account.application.all([
                { memcmp: { offset: 8, bytes: eventPDA.toBase58() } }
            ]);
            setApplications(allApps);

            // Load profiles for all applicants
            const profiles = { ...applicantProfiles };
            for (const app of allApps) {
                const applicantAddress = app.account.applicant.toString();
                if (!profiles[applicantAddress]) {
                    try {
                        const res = await fetch(`/api/profile?walletAddress=${applicantAddress}`);
                        const data = await res.json();
                        if (data.success && data.exists) {
                            profiles[applicantAddress] = data.profile;
                        }
                    } catch (e) {
                        console.error('Failed to load profile:', e);
                    }
                }
            }
            setApplicantProfiles(profiles);
        } catch (error) {
            console.error('Failed to load applications:', error);
        }
    };

    const handleViewDetail = async (app) => {
        setLoadingDetail(true);
        setShowDetailModal(true);
        setDetailData(null);
        try {
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${app.account.ipfsHash}`);
            const data = await response.json();
            setDetailData(data);
        } catch (error) {
            setDetailData({ error: 'Failed to load details' });
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleApprove = async (app) => {
        if (!approveAmount) {
            toast.error('Missing amount', { description: 'Please enter approval amount' });
            return;
        }
        try {
            const amountLamports = Math.floor(parseFloat(approveAmount) * 1e9);
            const result = await approveApplication(selectedEvent.publicKey, app.publicKey, amountLamports);
            if (result.success) {
                toast.success('✅ Application approved!', { description: `Approved ${approveAmount} SOL` });
                setSelectedApp(null);
                setApproveAmount('');
                loadApplications(selectedEvent.publicKey);
                loadMyEvents();
            } else {
                toast.error('Approval failed', { description: result.error });
            }
        } catch (error) {
            toast.error('Approval failed', { description: error.message });
        }
    };

    const handleDisburse = async () => {
        if (!disburseApp) return;
        try {
            const result = await disburseFunds(selectedEvent.publicKey, disburseApp.publicKey, disburseApp.account.applicant.toString());
            if (result.success) {
                toast.success('💰 Funds disbursed!', { description: 'Funds have been sent successfully' });
                setDisburseApp(null);
                loadApplications(selectedEvent.publicKey);
                loadMyEvents();
            } else {
                toast.error('Disbursement failed', { description: result.error });
            }
        } catch (error) {
            toast.error('Disbursement failed', { description: error.message });
        }
    };

    const formatSOL = (lamports) => (lamports / 1e9).toFixed(4);
    const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleDateString('en-US');

    const getStatusConfig = (status) => {
        if (status.pending) return { text: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '⏳' };
        if (status.approved) return { text: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', icon: '✅' };
        if (status.rejected) return { text: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: '❌' };
        if (status.paid) return { text: 'Paid', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '💰' };
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '❓' };
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />
                <div className="text-center relative z-10">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-[28px] flex items-center justify-center shadow-[0_10px_40px_rgb(124,58,237,0.3)]">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">Manage Events</h1>
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

            <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(124,58,237,0.25)]">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">Manage Events</span>
                    </h1>
                    <p className="text-neutral-500 text-lg">Review and approve funding applications</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                ) : myEvents.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-neutral-600 text-lg mb-2">No Events Yet</p>
                        <p className="text-neutral-400 text-sm">Create your first funding event to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Event Selector */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100 overflow-hidden">
                                <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-cyan-50 border-b-2 border-purple-100">
                                    <h2 className="text-lg font-bold text-neutral-800">My Events</h2>
                                    <p className="text-sm text-neutral-500">{myEvents.length} event{myEvents.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="p-3 space-y-2">
                                    {myEvents.map((event) => (
                                        <div
                                            key={event.publicKey.toString()}
                                            onClick={() => setSelectedEvent(event)}
                                            className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                                                selectedEvent?.publicKey.toString() === event.publicKey.toString()
                                                    ? 'bg-gradient-to-r from-purple-100 to-cyan-100 border-2 border-purple-300 shadow-md'
                                                    : 'bg-neutral-50 hover:bg-purple-50 border-2 border-transparent hover:border-purple-200'
                                            }`}
                                        >
                                            <h3 className="font-semibold text-neutral-800 truncate">{event.account.title}</h3>
                                            <div className="flex items-center gap-3 mt-2 text-sm">
                                                <span className="text-green-600 font-medium">{formatSOL(event.account.remainingAmount)} SOL</span>
                                                <span className="text-neutral-300">•</span>
                                                <span className="text-neutral-500">{event.account.applicationCount} apps</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Applications List */}
                        <div className="lg:col-span-2">
                            {selectedEvent && (
                                <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100 overflow-hidden">
                                    <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-cyan-50 border-b-2 border-purple-100">
                                        <h2 className="text-lg font-bold text-neutral-800">{selectedEvent.account.title}</h2>
                                        <p className="text-sm text-neutral-500">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
                                    </div>

                                    {applications.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="w-12 h-12 mx-auto mb-3 bg-neutral-100 rounded-full flex items-center justify-center">
                                                <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-neutral-500">No applications yet</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y-2 divide-purple-50">
                                            {applications.map((app) => {
                                                const statusConfig = getStatusConfig(app.account.status);
                                                const applicantAddress = app.account.applicant.toString();
                                                const profile = applicantProfiles[applicantAddress];
                                                return (
                                                    <div key={app.publicKey.toString()} className="p-5 hover:bg-purple-50/30 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            {/* Avatar */}
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20 overflow-hidden">
                                                                {profile?.avatar ? (
                                                                    <img src={getAvatarPath(profile.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-white font-bold text-sm">
                                                                        {applicantAddress.slice(0, 2).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-semibold text-sm text-neutral-800">
                                                                        {profile?.displayName || profile?.username || `${applicantAddress.slice(0, 6)}...${applicantAddress.slice(-4)}`}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusConfig.color}`}>
                                                                        {statusConfig.icon} {statusConfig.text}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-sm">
                                                                    <span className="text-purple-600 font-semibold">{formatSOL(app.account.requestedAmount)} SOL</span>
                                                                    {app.account.approvedAmount > 0 && (
                                                                        <>
                                                                            <span className="text-neutral-300">→</span>
                                                                            <span className="text-green-600 font-semibold">{formatSOL(app.account.approvedAmount)} SOL</span>
                                                                        </>
                                                                    )}
                                                                    <span className="text-neutral-300">•</span>
                                                                    <span className="text-neutral-500">{formatDate(app.account.appliedAt)}</span>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <button
                                                                    onClick={() => handleViewDetail(app)}
                                                                    className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                                                                >
                                                                    Details
                                                                </button>
                                                                {app.account.status.pending && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedApp(app);
                                                                            setApproveAmount(formatSOL(app.account.requestedAmount));
                                                                        }}
                                                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl transition-all shadow-md shadow-green-500/25"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                )}
                                                                {app.account.status.approved && (
                                                                    <button
                                                                        onClick={() => setDisburseApp(app)}
                                                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl transition-all shadow-md shadow-blue-500/25"
                                                                    >
                                                                        Disburse
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Approval Modal */}
            {selectedApp && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-6 shadow-[0_25px_50px_rgb(0,0,0,0.15),0_10px_40px_rgb(124,58,237,0.1)] border-2 border-purple-100">
                        <h2 className="text-xl font-bold mb-6 text-neutral-800">Approve Application</h2>
                        <div className="mb-5 p-4 bg-purple-50 rounded-2xl border-2 border-purple-100">
                            <p className="text-sm text-neutral-500 mb-1">Requested Amount</p>
                            <p className="text-2xl font-bold text-purple-600">{formatSOL(selectedApp.account.requestedAmount)} SOL</p>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Approval Amount (SOL)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={approveAmount}
                                onChange={(e) => setApproveAmount(e.target.value)}
                                className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-2xl focus:border-purple-400 focus:bg-white transition-all outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSelectedApp(null); setApproveAmount(''); }}
                                className="flex-1 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 rounded-2xl text-neutral-700 font-medium transition-all"
                                disabled={isApproving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleApprove(selectedApp)}
                                disabled={isApproving}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-medium shadow-lg shadow-green-500/25 transition-all disabled:opacity-50"
                            >
                                {isApproving ? 'Approving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disburse Confirmation Modal */}
            {disburseApp && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-6 shadow-[0_25px_50px_rgb(0,0,0,0.15),0_10px_40px_rgb(124,58,237,0.1)] border-2 border-purple-100">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-neutral-800">Confirm Disbursement</h2>
                            <p className="text-neutral-500 mt-2">Are you sure you want to send funds?</p>
                        </div>

                        <div className="mb-6 p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
                            {/* Recipient Info */}
                            {(() => {
                                const recipientAddress = disburseApp.account.applicant.toString();
                                const recipientProfile = applicantProfiles[recipientAddress];
                                return (
                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-blue-200">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center overflow-hidden shadow-md">
                                            {recipientProfile?.avatar ? (
                                                <img src={getAvatarPath(recipientProfile.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white font-bold text-xs">{recipientAddress.slice(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-800">
                                                {recipientProfile?.displayName || recipientProfile?.username || 'Unknown User'}
                                            </p>
                                            <p className="font-mono text-xs text-neutral-500">
                                                {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-neutral-500">Amount</span>
                                <span className="text-xl font-bold text-blue-600">{formatSOL(disburseApp.account.approvedAmount)} SOL</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDisburseApp(null)}
                                className="flex-1 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 rounded-2xl text-neutral-700 font-medium transition-all"
                                disabled={isDisbursing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDisburse}
                                disabled={isDisbursing}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-medium shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDisbursing ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Confirm
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full p-6 shadow-[0_25px_50px_rgb(0,0,0,0.15),0_10px_40px_rgb(124,58,237,0.1)] border-2 border-purple-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-neutral-800">Application Details</h2>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
                                <p className="mt-4 text-neutral-500">Loading...</p>
                            </div>
                        ) : detailData?.error ? (
                            <div className="text-center py-12 text-red-500">{detailData.error}</div>
                        ) : detailData ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-purple-50 rounded-2xl border-2 border-purple-100">
                                    <h3 className="font-semibold text-neutral-800 mb-2">Applicant</h3>
                                    <p className="font-mono text-xs text-neutral-600 break-all">{detailData.applicant}</p>
                                    {detailData.contactInfo && <p className="text-sm text-neutral-600 mt-2">Contact: {detailData.contactInfo}</p>}
                                </div>
                                <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-100">
                                    <h3 className="font-semibold text-neutral-800 mb-1">Requested</h3>
                                    <p className="text-2xl font-bold text-green-600">{detailData.requestedAmount} SOL</p>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border-2 border-neutral-200">
                                    <h3 className="font-semibold text-neutral-800 mb-2">Reason</h3>
                                    <p className="text-neutral-700 whitespace-pre-wrap">{detailData.reason}</p>
                                </div>
                                {detailData.photoUrl && (
                                    <div className="p-4 bg-white rounded-2xl border-2 border-neutral-200">
                                        <h3 className="font-semibold text-neutral-800 mb-2">Photo</h3>
                                        <img src={detailData.photoUrl} alt="Supporting" className="w-full rounded-xl" />
                                    </div>
                                )}
                            </div>
                        ) : null}

                        <button
                            onClick={() => setShowDetailModal(false)}
                            className="w-full mt-6 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-medium transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

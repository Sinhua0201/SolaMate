import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { SolanaConnectButton } from '@/components/solana-connect-button';
import { useIPFS } from '@/hooks/useIPFS';
import { useCreateFundingEvent, useApproveApplication, useDisburseFunds } from '@/lib/solana/hooks/useFundingProgram';
import { getProgram } from '@/lib/solana/anchorSetup';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';

export default function FundingEventsPage() {
    const wallet = useWallet();
    const { publicKey, connected } = wallet;
    const [myEvents, setMyEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Approval states
    const [selectedApp, setSelectedApp] = useState(null);
    const [approveAmount, setApproveAmount] = useState('');
    const [disburseApp, setDisburseApp] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [applicantProfiles, setApplicantProfiles] = useState({});

    const { approveApplication, isLoading: isApproving } = useApproveApplication();
    const { disburseFunds, isLoading: isDisbursing } = useDisburseFunds();

    const getAvatarPath = (avatarName) => avatarName ? `/avatar/${avatarName}` : null;
    const formatSOL = (lamports) => (lamports / 1e9).toFixed(4);
    const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

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

    const getStatusConfig = (status) => {
        if (status.pending) return { text: 'Pending', color: 'bg-amber-100 text-amber-700', icon: '⏳' };
        if (status.approved) return { text: 'Approved', color: 'bg-green-100 text-green-700', icon: '✅' };
        if (status.rejected) return { text: 'Rejected', color: 'bg-red-100 text-red-700', icon: '❌' };
        if (status.paid) return { text: 'Paid', color: 'bg-blue-100 text-blue-700', icon: '💰' };
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-700', icon: '❓' };
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar />
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-md mx-auto text-center">
                        <h1 className="text-3xl font-bold mb-4">Funding Events</h1>
                        <p className="text-gray-600 mb-8">Please connect your wallet to manage events</p>
                        <SolanaConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">Funding Events</h1>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all"
                    >
                        + Create Event
                    </button>
                </div>


                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                ) : myEvents.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📋</div>
                        <h2 className="text-xl font-semibold mb-2">No events created yet</h2>
                        <p className="text-gray-600 mb-6">Create your first funding event to get started!</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all"
                        >
                            Create Event
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Event Selector */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <h2 className="text-lg font-bold">My Events</h2>
                                    <p className="text-sm text-gray-500">{myEvents.length} event{myEvents.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="p-3 space-y-2">
                                    {myEvents.map((event) => (
                                        <div
                                            key={event.publicKey.toString()}
                                            onClick={() => setSelectedEvent(event)}
                                            className={`p-4 rounded-xl cursor-pointer transition-all ${
                                                selectedEvent?.publicKey.toString() === event.publicKey.toString()
                                                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 shadow-md'
                                                    : 'bg-gray-50 hover:bg-purple-50 border-2 border-transparent hover:border-purple-200'
                                            }`}
                                        >
                                            <h3 className="font-semibold truncate">{event.account.title}</h3>
                                            <div className="flex items-center gap-3 mt-2 text-sm">
                                                <span className="text-green-600 font-medium">{formatSOL(event.account.remainingAmount)} SOL</span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-gray-500">{event.account.applicationCount} apps</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Applications List */}
                        <div className="lg:col-span-2">
                            {selectedEvent && (
                                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                        <h2 className="text-lg font-bold">{selectedEvent.account.title}</h2>
                                        <p className="text-sm text-gray-500">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
                                    </div>

                                    {applications.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="text-4xl mb-3">📭</div>
                                            <p className="text-gray-500">No applications yet</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {applications.map((app) => {
                                                const statusConfig = getStatusConfig(app.account.status);
                                                const applicantAddress = app.account.applicant.toString();
                                                const profile = applicantProfiles[applicantAddress];
                                                return (
                                                    <div key={app.publicKey.toString()} className="p-5 hover:bg-gray-50 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                {profile?.avatar ? (
                                                                    <img src={getAvatarPath(profile.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-white font-bold text-sm">{applicantAddress.slice(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-semibold text-sm">
                                                                        {profile?.username || `${applicantAddress.slice(0, 6)}...${applicantAddress.slice(-4)}`}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                                                                        {statusConfig.icon} {statusConfig.text}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-sm">
                                                                    <span className="text-purple-600 font-semibold">{formatSOL(app.account.requestedAmount)} SOL</span>
                                                                    {app.account.approvedAmount > 0 && (
                                                                        <>
                                                                            <span className="text-gray-300">→</span>
                                                                            <span className="text-green-600 font-semibold">{formatSOL(app.account.approvedAmount)} SOL</span>
                                                                        </>
                                                                    )}
                                                                    <span className="text-gray-300">•</span>
                                                                    <span className="text-gray-500">{formatDate(app.account.appliedAt)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <button onClick={() => handleViewDetail(app)} className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
                                                                    Details
                                                                </button>
                                                                {app.account.status.pending && (
                                                                    <button
                                                                        onClick={() => { setSelectedApp(app); setApproveAmount(formatSOL(app.account.requestedAmount)); }}
                                                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                )}
                                                                {app.account.status.approved && (
                                                                    <button onClick={() => setDisburseApp(app)} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
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


            {/* Create Event Modal */}
            <CreateEventModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={() => { setIsCreateModalOpen(false); loadMyEvents(); }} />

            {/* Approval Modal */}
            {selectedApp && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
                        <h2 className="text-xl font-bold mb-6">Approve Application</h2>
                        <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">Requested Amount</p>
                            <p className="text-2xl font-bold text-purple-600">{formatSOL(selectedApp.account.requestedAmount)} SOL</p>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Approval Amount (SOL)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={approveAmount}
                                onChange={(e) => setApproveAmount(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-400 focus:bg-white transition-all outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setSelectedApp(null); setApproveAmount(''); }} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium" disabled={isApproving}>Cancel</button>
                            <button onClick={() => handleApprove(selectedApp)} disabled={isApproving} className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50">
                                {isApproving ? 'Approving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disburse Modal */}
            {disburseApp && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                                <span className="text-3xl">💰</span>
                            </div>
                            <h2 className="text-xl font-bold">Confirm Disbursement</h2>
                            <p className="text-gray-500 mt-2">Are you sure you want to send funds?</p>
                        </div>
                        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            {(() => {
                                const recipientAddress = disburseApp.account.applicant.toString();
                                const recipientProfile = applicantProfiles[recipientAddress];
                                return (
                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-blue-200">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden">
                                            {recipientProfile?.avatar ? (
                                                <img src={getAvatarPath(recipientProfile.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white font-bold text-xs">{recipientAddress.slice(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{recipientProfile?.username || 'Unknown User'}</p>
                                            <p className="font-mono text-xs text-gray-500">{recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Amount</span>
                                <span className="text-xl font-bold text-blue-600">{formatSOL(disburseApp.account.approvedAmount)} SOL</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDisburseApp(null)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium" disabled={isDisbursing}>Cancel</button>
                            <button onClick={handleDisburse} disabled={isDisbursing} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium disabled:opacity-50">
                                {isDisbursing ? 'Sending...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Application Details</h2>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
                        </div>
                        {loadingDetail ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
                            </div>
                        ) : detailData?.error ? (
                            <div className="text-center py-12 text-red-500">{detailData.error}</div>
                        ) : detailData ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h3 className="font-semibold mb-2">Applicant</h3>
                                    <p className="font-mono text-xs text-gray-600 break-all">{detailData.applicant}</p>
                                    {detailData.contactInfo && <p className="text-sm text-gray-600 mt-2">Contact: {detailData.contactInfo}</p>}
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                    <h3 className="font-semibold mb-1">Requested</h3>
                                    <p className="text-2xl font-bold text-green-600">{detailData.requestedAmount} SOL</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-gray-200">
                                    <h3 className="font-semibold mb-2">Reason</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{detailData.reason}</p>
                                </div>
                                {detailData.photoUrl && (
                                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                                        <h3 className="font-semibold mb-2">Photo</h3>
                                        <img src={detailData.photoUrl} alt="Supporting" className="w-full rounded-xl" />
                                    </div>
                                )}
                            </div>
                        ) : null}
                        <button onClick={() => setShowDetailModal(false)} className="w-full mt-6 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}


function CreateEventModal({ isOpen, onClose, onSuccess }) {
    const { uploadJSON, uploading } = useIPFS();
    const { createEvent, isLoading } = useCreateFundingEvent();
    const [formData, setFormData] = useState({ title: '', description: '', amount: '', deadline: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const eventData = { title: formData.title, description: formData.description, createdAt: Date.now() };
            const ipfsResult = await uploadJSON(eventData, { name: `event-${formData.title}.json` });
            if (!ipfsResult.success) throw new Error('Failed to upload to IPFS');

            const amount = Math.floor(parseFloat(formData.amount) * LAMPORTS_PER_SOL);
            const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000);
            const eventResult = await createEvent(formData.title, amount, deadline, ipfsResult.ipfsHash);

            if (eventResult.success) {
                toast.success('🎉 Event created!', { description: 'Your funding event has been created successfully' });
                setFormData({ title: '', description: '', amount: '', deadline: '' });
                onSuccess();
            } else {
                toast.error('Creation failed', { description: eventResult.error });
            }
        } catch (error) {
            toast.error('Creation failed', { description: error.message });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white flex justify-between items-center">
                    <h2 className="text-xl font-bold">Create Funding Event</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                        <input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Community Scholarship Fund"
                            required
                            maxLength={64}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-400 focus:bg-white transition-all outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the purpose and how funds will be used..."
                            required
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-400 focus:bg-white transition-all outline-none resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (SOL)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-400 focus:bg-white transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-400 focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium" disabled={uploading || isLoading}>Cancel</button>
                        <button type="submit" disabled={uploading || isLoading} className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium disabled:opacity-50">
                            {uploading || isLoading ? 'Creating...' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '@/lib/solana/anchorSetup';
import { useApproveApplication, useDisburseFunds } from '@/lib/solana/hooks/useFundingProgram';
import { Navbar } from '@/components/navbar';

// Import WalletMultiButton dynamically to avoid SSR issues
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

    const { approveApplication, isLoading: isApproving } = useApproveApplication();
    const { disburseFunds, isLoading: isDisbursing } = useDisburseFunds();

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

            // Get all events I created
            const allEvents = await program.account.fundingEvent.all([
                {
                    memcmp: {
                        offset: 8, // Skip discriminator
                        bytes: publicKey.toBase58(),
                    }
                }
            ]);

            setMyEvents(allEvents);
            if (allEvents.length > 0) {
                setSelectedEvent(allEvents[0]);
            }
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadApplications = async (eventPDA) => {
        try {
            const program = getProgram(wallet);

            // Get all applications for this event
            const allApps = await program.account.application.all([
                {
                    memcmp: {
                        offset: 8, // Skip discriminator
                        bytes: eventPDA.toBase58(),
                    }
                }
            ]);

            setApplications(allApps);
        } catch (error) {
            console.error('Failed to load applications:', error);
        }
    };

    const handleViewDetail = async (app) => {
        setLoadingDetail(true);
        setShowDetailModal(true);
        setDetailData(null);

        try {
            // Fetch data from IPFS
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${app.account.ipfsHash}`);
            const data = await response.json();
            setDetailData(data);
        } catch (error) {
            console.error('Failed to load application details:', error);
            setDetailData({ error: 'Failed to load details' });
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleApprove = async (app) => {
        if (!approveAmount) {
            alert('Please enter approval amount');
            return;
        }

        try {
            const amountLamports = Math.floor(parseFloat(approveAmount) * 1e9);
            const result = await approveApplication(
                selectedEvent.publicKey,
                app.publicKey,
                amountLamports
            );

            if (result.success) {
                alert('Application approved!');
                setSelectedApp(null);
                setApproveAmount('');
                loadApplications(selectedEvent.publicKey);
                loadMyEvents();
            } else {
                alert('Approval failed: ' + result.error);
            }
        } catch (error) {
            console.error('Approval failed:', error);
            alert('Approval failed: ' + error.message);
        }
    };

    const handleDisburse = async (app) => {
        if (!confirm('Confirm fund disbursement?')) return;

        try {
            const result = await disburseFunds(
                selectedEvent.publicKey,
                app.publicKey,
                app.account.applicant.toString()
            );

            if (result.success) {
                alert('Funds disbursed successfully!');
                loadApplications(selectedEvent.publicKey);
                loadMyEvents();
            } else {
                alert('Disbursement failed: ' + result.error);
            }
        } catch (error) {
            console.error('Disbursement failed:', error);
            alert('Disbursement failed: ' + error.message);
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
        if (status.pending) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
        if (status.approved) return 'text-green-700 bg-green-100 border-green-300';
        if (status.rejected) return 'text-red-700 bg-red-100 border-red-300';
        if (status.paid) return 'text-blue-700 bg-blue-100 border-blue-300';
        return 'text-gray-700 bg-gray-100 border-gray-300';
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />

                <div className="text-center relative z-10">
                    <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">Manage Events</h1>
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

            <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                            Manage Events
                        </span>
                    </h1>
                    <p className="text-neutral-600">Review and approve funding applications</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                ) : myEvents.length === 0 ? (
                    <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-lg shadow border border-purple-200">
                        <p className="text-neutral-600">You haven't created any funding events yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Event List */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-4 border border-purple-100">
                                <h2 className="text-xl font-bold mb-4 text-neutral-800">My Events</h2>
                                <div className="space-y-2">
                                    {myEvents.map((event) => (
                                        <div
                                            key={event.publicKey.toString()}
                                            onClick={() => setSelectedEvent(event)}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedEvent?.publicKey.toString() === event.publicKey.toString()
                                                ? 'bg-gradient-to-r from-purple-100 to-cyan-100 border-2 border-purple-400'
                                                : 'bg-purple-50 hover:bg-purple-100 border border-purple-200'
                                                }`}
                                        >
                                            <h3 className="font-semibold text-neutral-800">{event.account.title}</h3>
                                            <p className="text-sm text-neutral-600">
                                                Remaining: {formatSOL(event.account.remainingAmount)} SOL
                                            </p>
                                            <p className="text-sm text-neutral-600">
                                                Applications: {event.account.applicationCount}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Applications List */}
                        <div className="lg:col-span-2">
                            {selectedEvent && (
                                <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-6 border border-purple-100">
                                    <h2 className="text-xl font-bold mb-4 text-neutral-800">
                                        {selectedEvent.account.title} - Applications
                                    </h2>

                                    {applications.length === 0 ? (
                                        <p className="text-neutral-600 text-center py-8">No applications yet</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {applications.map((app) => (
                                                <div
                                                    key={app.publicKey.toString()}
                                                    className="border border-purple-200 rounded-lg p-4 bg-white"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="text-sm text-neutral-600">Applicant</p>
                                                            <p className="font-mono text-xs text-neutral-800">
                                                                {app.account.applicant.toString().slice(0, 8)}...
                                                            </p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(app.account.status)}`}>
                                                            {getStatusText(app.account.status)}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                                                        <div>
                                                            <p className="text-neutral-600">Requested Amount</p>
                                                            <p className="font-semibold text-purple-600">
                                                                {formatSOL(app.account.requestedAmount)} SOL
                                                            </p>
                                                        </div>
                                                        {app.account.approvedAmount > 0 && (
                                                            <div>
                                                                <p className="text-neutral-600">Approved Amount</p>
                                                                <p className="font-semibold text-green-600">
                                                                    {formatSOL(app.account.approvedAmount)} SOL
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-neutral-600">Applied At</p>
                                                            <p className="text-neutral-800">{formatDate(app.account.appliedAt)}</p>
                                                        </div>
                                                    </div>

                                                    {/* View Details Button */}
                                                    <button
                                                        onClick={() => handleViewDetail(app)}
                                                        className="w-full mb-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                                                    >
                                                        View Details
                                                    </button>

                                                    {/* Action Buttons */}
                                                    {app.account.status.pending && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedApp(app);
                                                                    setApproveAmount(formatSOL(app.account.requestedAmount));
                                                                }}
                                                                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600"
                                                            >
                                                                Approve
                                                            </button>
                                                        </div>
                                                    )}

                                                    {app.account.status.approved && (
                                                        <button
                                                            onClick={() => handleDisburse(app)}
                                                            disabled={isDisbursing}
                                                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
                                                        >
                                                            {isDisbursing ? 'Disbursing...' : 'Disburse Funds'}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-4 text-neutral-800">Approve Application</h2>

                        <div className="mb-4">
                            <p className="text-sm text-neutral-600">Requested Amount</p>
                            <p className="text-lg font-semibold text-neutral-800">
                                {formatSOL(selectedApp.account.requestedAmount)} SOL
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Approval Amount (SOL)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={approveAmount}
                                onChange={(e) => setApproveAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedApp(null);
                                    setApproveAmount('');
                                }}
                                className="flex-1 px-4 py-2 border border-purple-300 rounded-lg hover:bg-purple-50 text-neutral-700"
                                disabled={isApproving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleApprove(selectedApp)}
                                disabled={isApproving}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 disabled:opacity-50"
                            >
                                {isApproving ? 'Approving...' : 'Confirm Approval'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-neutral-800">Application Details</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-neutral-500 hover:text-neutral-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                                <p className="mt-4 text-neutral-600">Loading details...</p>
                            </div>
                        ) : detailData?.error ? (
                            <div className="text-center py-12">
                                <p className="text-red-600">{detailData.error}</p>
                            </div>
                        ) : detailData ? (
                            <div className="space-y-4">
                                {/* Applicant Info */}
                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                    <h3 className="font-semibold text-neutral-800 mb-2">Applicant Information</h3>
                                    <p className="text-sm text-neutral-600">
                                        <span className="font-medium">Wallet:</span>{' '}
                                        <span className="font-mono text-xs">{detailData.applicant}</span>
                                    </p>
                                    {detailData.contactInfo && (
                                        <p className="text-sm text-neutral-600 mt-1">
                                            <span className="font-medium">Contact:</span> {detailData.contactInfo}
                                        </p>
                                    )}
                                    <p className="text-sm text-neutral-600 mt-1">
                                        <span className="font-medium">Applied:</span>{' '}
                                        {new Date(detailData.appliedAt).toLocaleString()}
                                    </p>
                                </div>

                                {/* Requested Amount */}
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h3 className="font-semibold text-neutral-800 mb-2">Requested Amount</h3>
                                    <p className="text-2xl font-bold text-green-600">
                                        {detailData.requestedAmount} SOL
                                    </p>
                                </div>

                                {/* Reason */}
                                <div className="bg-white p-4 rounded-lg border border-neutral-200">
                                    <h3 className="font-semibold text-neutral-800 mb-2">Reason for Application</h3>
                                    <p className="text-neutral-700 whitespace-pre-wrap">{detailData.reason}</p>
                                </div>

                                {/* Photo */}
                                {detailData.photoUrl && (
                                    <div className="bg-white p-4 rounded-lg border border-neutral-200">
                                        <h3 className="font-semibold text-neutral-800 mb-2">Supporting Photo</h3>
                                        <img
                                            src={detailData.photoUrl}
                                            alt="Supporting document"
                                            className="w-full rounded-lg border border-neutral-300"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                        <p className="text-sm text-red-500 mt-2" style={{ display: 'none' }}>
                                            Failed to load image
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        <button
                            onClick={() => setShowDetailModal(false)}
                            className="w-full mt-6 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

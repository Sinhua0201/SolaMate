import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '@/lib/solana/anchorSetup';
import { useApplyForFunding } from '@/lib/solana/hooks/useFundingProgram';
import { useIPFS } from '@/hooks/useIPFS';
import { Navbar } from '@/components/navbar';

// Import WalletMultiButton dynamically to avoid SSR issues
const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function FundingApplyPage() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [appliedEvents, setAppliedEvents] = useState(new Set()); // Track applied events

    // Application form
    const [requestedAmount, setRequestedAmount] = useState('');
    const [reason, setReason] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);

    const { applyForFunding, isLoading: isApplying } = useApplyForFunding();
    const { uploadJSON, uploadFile } = useIPFS();

    // Load all active funding events
    useEffect(() => {
        if (publicKey) {
            loadEvents();
            loadMyApplications();
        }
    }, [publicKey]);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const program = getProgram(wallet);

            // Get all FundingEvent accounts
            const allEvents = await program.account.fundingEvent.all();

            // Filter active and not expired events, and exclude events created by current user
            const now = Math.floor(Date.now() / 1000);
            const activeEvents = allEvents.filter(event => {
                return event.account.status.active &&
                    event.account.deadline > now &&
                    event.account.remainingAmount > 0 &&
                    event.account.creator.toString() !== publicKey.toString(); // Can't apply to own events
            });

            setEvents(activeEvents);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMyApplications = async () => {
        try {
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

            // Create a Set of event addresses I've already applied to
            const appliedEventAddresses = new Set(
                allApps.map(app => app.account.event.toString())
            );
            setAppliedEvents(appliedEventAddresses);
        } catch (error) {
            console.error('Failed to load applications:', error);
        }
    };

    const handleApplyClick = (event) => {
        // Check if already applied
        if (appliedEvents.has(event.publicKey.toString())) {
            alert('You have already applied to this event');
            return;
        }

        setSelectedEvent(event);
        setShowApplyModal(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }

            // Check file type (images only)
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            setSelectedFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitApplication = async () => {
        if (!selectedEvent || !requestedAmount || !reason) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            let photoUrl = null;

            // 1. Upload photo to IPFS if selected
            if (selectedFile) {
                const photoResult = await uploadFile(selectedFile);
                if (!photoResult.success) {
                    alert('Failed to upload photo');
                    return;
                }
                photoUrl = photoResult.url;
            }

            // 2. Prepare application data
            const applicationData = {
                reason,
                contactInfo,
                requestedAmount: parseFloat(requestedAmount),
                appliedAt: new Date().toISOString(),
                applicant: publicKey.toString(),
                photoUrl: photoUrl || null, // Include photo URL if uploaded
            };

            // 3. Upload application data to IPFS
            const ipfsResult = await uploadJSON(applicationData);
            if (!ipfsResult.success) {
                alert('Failed to upload application data');
                return;
            }

            // 4. Submit to blockchain
            const amountLamports = Math.floor(parseFloat(requestedAmount) * 1e9); // SOL to lamports
            const result = await applyForFunding(
                selectedEvent.publicKey,
                amountLamports,
                ipfsResult.ipfsHash
            );

            if (result.success) {
                alert('Application submitted successfully!');

                // Add this event to applied events
                setAppliedEvents(prev => new Set([...prev, selectedEvent.publicKey.toString()]));

                setShowApplyModal(false);
                setRequestedAmount('');
                setReason('');
                setContactInfo('');
                setSelectedFile(null);
                setFilePreview(null);
                loadEvents(); // Reload
            } else {
                alert('Application failed: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to submit application:', error);
            alert('Failed to submit: ' + error.message);
        }
    };

    const formatSOL = (lamports) => {
        return (lamports / 1e9).toFixed(4);
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US');
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />

                <div className="text-center relative z-10">
                    <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">Apply for Funding</h1>
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

            <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                            Apply for Funding
                        </span>
                    </h1>
                    <p className="text-neutral-600">Browse and apply for available funding events</p>
                </div>

                {/* Events List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-neutral-600">Loading...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-lg shadow border border-purple-200">
                        <p className="text-neutral-600">No funding events available</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <div
                                key={event.publicKey.toString()}
                                className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-purple-100"
                            >
                                <h3 className="text-xl font-bold text-neutral-800 mb-3">
                                    {event.account.title}
                                </h3>

                                <div className="space-y-2 text-sm text-neutral-600 mb-4">
                                    <div className="flex justify-between">
                                        <span>Total Amount:</span>
                                        <span className="font-semibold text-purple-600">
                                            {formatSOL(event.account.totalAmount)} SOL
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Remaining:</span>
                                        <span className="font-semibold text-green-600">
                                            {formatSOL(event.account.remainingAmount)} SOL
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Deadline:</span>
                                        <span>{formatDate(event.account.deadline)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Applications:</span>
                                        <span>{event.account.applicationCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Approved:</span>
                                        <span>{event.account.approvedCount}</span>
                                    </div>
                                </div>

                                {appliedEvents.has(event.publicKey.toString()) ? (
                                    <button
                                        disabled
                                        className="w-full bg-gray-400 text-white py-2 rounded-lg cursor-not-allowed"
                                    >
                                        Already Applied
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleApplyClick(event)}
                                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-colors"
                                    >
                                        Apply for Funding
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Application Modal */}
            {showApplyModal && selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-4 text-neutral-800">Apply for Funding</h2>
                        <p className="text-neutral-600 mb-4">
                            Event: {selectedEvent.account.title}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Requested Amount (SOL) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={requestedAmount}
                                    onChange={(e) => setRequestedAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Available: {formatSOL(selectedEvent.account.remainingAmount)} SOL
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Reason for Application *
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                    rows="4"
                                    placeholder="Please explain your reason..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Contact Information
                                </label>
                                <input
                                    type="text"
                                    value={contactInfo}
                                    onChange={(e) => setContactInfo(e.target.value)}
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                    placeholder="Email or other contact"
                                />
                            </div>

                            {/* Photo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Supporting Photo (Optional)
                                </label>
                                <div className="mt-2">
                                    {filePreview ? (
                                        <div className="relative">
                                            <img
                                                src={filePreview}
                                                alt="Preview"
                                                className="w-full h-48 object-cover rounded-lg border-2 border-purple-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFile(null);
                                                    setFilePreview(null);
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-purple-300 border-dashed rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <svg className="w-8 h-8 mb-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <p className="text-sm text-neutral-600">
                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-neutral-500">PNG, JPG, GIF up to 5MB</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowApplyModal(false)}
                                className="flex-1 px-4 py-2 border border-purple-300 rounded-lg hover:bg-purple-50 text-neutral-700"
                                disabled={isApplying}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitApplication}
                                disabled={isApplying}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50"
                            >
                                {isApplying ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

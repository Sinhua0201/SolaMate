import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '@/lib/solana/anchorSetup';
import { useApplyForFunding } from '@/lib/solana/hooks/useFundingProgram';
import { useIPFS } from '@/hooks/useIPFS';
import { Navbar } from '@/components/navbar';
import { toast } from 'sonner';

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
            toast.error('Already applied', {
                description: 'You have already applied to this event',
            });
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
                toast.error('File too large', {
                    description: 'File size must be less than 5MB',
                });
                return;
            }

            // Check file type (images only)
            if (!file.type.startsWith('image/')) {
                toast.error('Invalid file type', {
                    description: 'Please select an image file',
                });
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
            toast.error('Missing fields', {
                description: 'Please fill in all required fields',
            });
            return;
        }

        try {
            let photoUrl = null;

            // 1. Upload photo to IPFS if selected
            if (selectedFile) {
                const photoResult = await uploadFile(selectedFile);
                if (!photoResult.success) {
                    toast.error('Upload failed', {
                        description: 'Failed to upload photo',
                    });
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
                toast.error('Upload failed', {
                    description: 'Failed to upload application data',
                });
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
                toast.success('🎉 Application submitted!', {
                    description: 'Your application has been submitted successfully',
                });

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
                toast.error('Application failed', {
                    description: result.error,
                });
            }
        } catch (error) {
            console.error('Failed to submit application:', error);
            toast.error('Submission failed', {
                description: error.message,
            });
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
                    <div className="text-center py-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <p className="text-neutral-500">No funding events available</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100 overflow-hidden">
                        {events.map((event, index) => (
                            <div
                                key={event.publicKey.toString()}
                                className={`flex items-center justify-between p-5 hover:bg-purple-50/70 transition-all duration-200 cursor-pointer active:bg-purple-100/70 ${index !== events.length - 1 ? 'border-b-2 border-purple-50' : ''}`}
                                onClick={() => !appliedEvents.has(event.publicKey.toString()) && handleApplyClick(event)}
                            >
                                {/* Left: Icon + Info */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-neutral-800 truncate">{event.account.title}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-sm">
                                            <span className="text-green-600 font-medium">{formatSOL(event.account.remainingAmount)} SOL</span>
                                            <span className="text-neutral-300">•</span>
                                            <span className="text-neutral-500">{formatDate(event.account.deadline)}</span>
                                            <span className="text-neutral-300">•</span>
                                            <span className="text-neutral-500">{event.account.applicationCount} applied</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Status/Action */}
                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                    {appliedEvents.has(event.publicKey.toString()) ? (
                                        <span className="px-3 py-1.5 bg-neutral-100 text-neutral-500 text-sm font-medium rounded-full">
                                            Applied
                                        </span>
                                    ) : (
                                        <>
                                            <span className="hidden sm:inline-block px-3 py-1.5 bg-purple-100 text-purple-600 text-sm font-medium rounded-full">
                                                Apply
                                            </span>
                                            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Application Modal */}
            {showApplyModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-[0_20px_60px_rgb(0,0,0,0.2),0_8px_40px_rgb(124,58,237,0.15)] border-2 border-purple-100 max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-neutral-800">Apply for Funding</h2>
                                <p className="text-sm text-neutral-500 mt-1">{selectedEvent.account.title}</p>
                            </div>
                            <button
                                onClick={() => setShowApplyModal(false)}
                                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Available Amount Badge */}
                        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-cyan-50 rounded-2xl border-2 border-purple-200/60 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-neutral-600">Available</span>
                                <span className="text-lg font-bold text-purple-600">{formatSOL(selectedEvent.account.remainingAmount)} SOL</span>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Requested Amount (SOL) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={requestedAmount}
                                    onChange={(e) => setRequestedAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-2xl focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 focus:bg-white transition-all duration-200 outline-none shadow-sm"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Reason for Application *
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-2xl focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 focus:bg-white transition-all duration-200 outline-none resize-none shadow-sm"
                                    rows="3"
                                    placeholder="Please explain your reason..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Contact Information
                                </label>
                                <input
                                    type="text"
                                    value={contactInfo}
                                    onChange={(e) => setContactInfo(e.target.value)}
                                    className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-2xl focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 focus:bg-white transition-all duration-200 outline-none shadow-sm"
                                    placeholder="Email or other contact"
                                />
                            </div>

                            {/* Photo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Supporting Photo (Optional)
                                </label>
                                {filePreview ? (
                                    <div className="relative">
                                        <img
                                            src={filePreview}
                                            alt="Preview"
                                            className="w-full h-40 object-cover rounded-2xl border-2 border-neutral-200 shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setFilePreview(null);
                                            }}
                                            className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-3 w-full py-4 bg-neutral-50 border-2 border-neutral-200 border-dashed rounded-2xl cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 shadow-sm">
                                        <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm text-neutral-500">Add Photo</span>
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

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowApplyModal(false)}
                                className="flex-1 px-4 py-3.5 bg-neutral-100 hover:bg-neutral-200 rounded-2xl text-neutral-700 font-medium transition-all duration-200 active:scale-[0.98] border-2 border-neutral-200 shadow-sm"
                                disabled={isApplying}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitApplication}
                                disabled={isApplying}
                                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-2xl hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50 font-medium shadow-[0_4px_15px_rgb(124,58,237,0.4)] border-2 border-purple-500 transition-all duration-200 active:scale-[0.98]"
                            >
                                {isApplying ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

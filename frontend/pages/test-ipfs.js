import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { useIPFS } from '@/hooks/useIPFS';
import { useCreateFundingEvent } from '@/lib/solana/hooks/useFundingProgram';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';

/**
 * Create Funding Event Page - iOS Style
 */
export default function FundingEventsPage() {
    const { connected } = useWallet();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
            {/* Animated gradient background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />

            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
                {/* Header with Icon */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold mb-3">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                            Create Event
                        </span>
                    </h1>
                    <p className="text-neutral-500 text-lg">Launch a funding event to help those in need</p>
                </div>

                {!connected ? (
                    <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100 p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <p className="text-neutral-600 text-lg mb-2">Wallet Not Connected</p>
                        <p className="text-neutral-400 text-sm">Please connect your wallet to create events</p>
                    </div>
                ) : (
                    <CreateEventForm />
                )}
            </div>
        </div>
    );
}

function CreateEventForm() {
    const { uploadJSON, uploading } = useIPFS();
    const { createEvent, isLoading } = useCreateFundingEvent();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        deadline: '',
    });
    const [result, setResult] = useState(null);
    const [focusedField, setFocusedField] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setResult(null);

        try {
            const eventData = {
                title: formData.title,
                description: formData.description,
                createdAt: Date.now(),
            };

            const ipfsResult = await uploadJSON(eventData, {
                name: `event-${formData.title}.json`
            });

            if (!ipfsResult.success) {
                throw new Error('Failed to upload to IPFS');
            }

            const amount = Math.floor(parseFloat(formData.amount) * LAMPORTS_PER_SOL);
            const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000);

            const eventResult = await createEvent(
                formData.title,
                amount,
                deadline,
                ipfsResult.ipfsHash
            );

            if (eventResult.success) {
                toast.success('🎉 Event created!', {
                    description: 'Your funding event has been created successfully',
                });
                setResult({
                    success: true,
                    message: 'Event created successfully!',
                    signature: eventResult.signature,
                    ipfsUrl: ipfsResult.url
                });
                setFormData({ title: '', description: '', amount: '', deadline: '' });
            } else {
                toast.error('Creation failed', {
                    description: eventResult.error,
                });
                setResult({ success: false, message: eventResult.error });
            }
        } catch (error) {
            toast.error('Creation failed', {
                description: error.message,
            });
            setResult({ success: false, message: error.message });
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100 overflow-hidden">
            {/* Form Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-purple-50 to-cyan-50 border-b-2 border-purple-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-purple-100">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-800">Event Details</h2>
                        <p className="text-sm text-neutral-500">Fill in the information below</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Title Field */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                        <span className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-xs">1</span>
                        Event Title
                    </label>
                    <input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        onFocus={() => setFocusedField('title')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g., Community Scholarship Fund"
                        required
                        maxLength={64}
                        className={`w-full px-5 py-4 bg-neutral-50 border-2 rounded-2xl text-neutral-800 placeholder-neutral-400 transition-all duration-300 outline-none ${
                            focusedField === 'title' 
                                ? 'border-purple-400 bg-white shadow-lg shadow-purple-500/10 scale-[1.01]' 
                                : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                    />
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                        <span className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-xs">2</span>
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        onFocus={() => setFocusedField('description')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Describe the purpose, eligibility requirements, and how funds will be used..."
                        required
                        rows={4}
                        className={`w-full px-5 py-4 bg-neutral-50 border-2 rounded-2xl text-neutral-800 placeholder-neutral-400 transition-all duration-300 outline-none resize-none ${
                            focusedField === 'description' 
                                ? 'border-purple-400 bg-white shadow-lg shadow-purple-500/10 scale-[1.01]' 
                                : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                    />
                </div>

                {/* Amount and Deadline Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Amount Field */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                            <span className="w-6 h-6 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 text-xs">3</span>
                            Total Amount
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                onFocus={() => setFocusedField('amount')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="0.00"
                                required
                                className={`w-full px-5 py-4 pr-16 bg-neutral-50 border-2 rounded-2xl text-neutral-800 placeholder-neutral-400 transition-all duration-300 outline-none ${
                                    focusedField === 'amount' 
                                        ? 'border-cyan-400 bg-white shadow-lg shadow-cyan-500/10 scale-[1.01]' 
                                        : 'border-neutral-200 hover:border-neutral-300'
                                }`}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold rounded-lg shadow-sm">
                                SOL
                            </div>
                        </div>
                    </div>

                    {/* Deadline Field */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                            <span className="w-6 h-6 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 text-xs">4</span>
                            Deadline
                        </label>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            onFocus={() => setFocusedField('deadline')}
                            onBlur={() => setFocusedField(null)}
                            required
                            className={`w-full px-5 py-4 bg-neutral-50 border-2 rounded-2xl text-neutral-800 transition-all duration-300 outline-none ${
                                focusedField === 'deadline' 
                                    ? 'border-cyan-400 bg-white shadow-lg shadow-cyan-500/10 scale-[1.01]' 
                                    : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={uploading || isLoading}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white text-lg font-semibold rounded-2xl shadow-[0_8px_30px_rgb(124,58,237,0.35)] border-2 border-purple-500 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {uploading || isLoading ? (
                        <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Event...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create Funding Event
                        </>
                    )}
                </button>

                {/* Result Message */}
                {result && (
                    <div className={`p-5 rounded-2xl border-2 ${
                        result.success 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                    }`}>
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                result.success ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                {result.success ? (
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                    {result.message}
                                </p>
                                {result.success && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                                            <span>Transaction:</span>
                                            <code className="px-2 py-1 bg-white rounded-lg text-xs font-mono border border-neutral-200">
                                                {result.signature?.slice(0, 20)}...
                                            </code>
                                        </div>
                                        <a
                                            href={result.ipfsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                                        >
                                            View on IPFS
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}

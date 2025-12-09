import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIPFS } from '@/hooks/useIPFS';
import { useCreateFundingEvent } from '@/lib/solana/hooks/useFundingProgram';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Plus } from 'lucide-react';

/**
 * Create Funding Event Page
 */
export default function FundingEventsPage() {
    const { connected } = useWallet();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
            {/* Animated gradient background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />

            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                            Funding Events
                        </span>
                    </h1>
                    <p className="text-neutral-600">Create funding events to help those in need</p>
                </div>

                {!connected ? (
                    <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
                        <p className="text-neutral-600 mb-4">Please connect your wallet</p>
                    </Card>
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
                setResult({
                    success: true,
                    message: 'Event created successfully!',
                    signature: eventResult.signature,
                    ipfsUrl: ipfsResult.url
                });
                setFormData({ title: '', description: '', amount: '', deadline: '' });
            } else {
                setResult({ success: false, message: eventResult.error });
            }
        } catch (error) {
            setResult({ success: false, message: error.message });
        }
    };

    return (
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
                <Plus className="h-6 w-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-neutral-800">Create Funding Event</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Event Title
                    </label>
                    <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Scholarship Program"
                        required
                        maxLength={64}
                        className="bg-white border-purple-200 text-neutral-800 focus:border-purple-400"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Event Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the purpose and requirements..."
                        required
                        rows={4}
                        className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Total Amount (SOL)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="1.0"
                            required
                            className="bg-white border-purple-200 text-neutral-800 focus:border-purple-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Deadline
                        </label>
                        <Input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            required
                            className="bg-white border-purple-200 text-neutral-800 focus:border-purple-400"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={uploading || isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white"
                >
                    {uploading || isLoading ? 'Creating...' : 'Create Event'}
                </Button>

                {result && (
                    <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'}`}>
                        <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                            {result.message}
                        </p>
                        {result.success && (
                            <div className="mt-2 text-sm space-y-1">
                                <p className="text-neutral-600">
                                    Transaction: <code className="text-xs bg-purple-100 px-2 py-1 rounded">{result.signature?.slice(0, 16)}...</code>
                                </p>
                                <a
                                    href={result.ipfsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-600 hover:underline block"
                                >
                                    View IPFS Data →
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </form>
        </Card>
    );
}

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Check, Upload, Camera, Users, DollarSign, FileText, Sparkles } from 'lucide-react';
import { useCreateGroupSplit } from '@/lib/solana/hooks/useGroupSplit';
import { getFriendsList } from '@/lib/solana/hooks/useSocialProgram';
import { getProgram } from '@/lib/solana/anchorSetup';
import { useOCR } from '@/hooks/useOCR';
import { useIPFS } from '@/hooks/useIPFS';
import { toast } from 'sonner';

const getAvatarPath = (name) => name ? `/avatar/${name}` : null;

export function CreateBillModal({ isOpen, onClose }) {
    const router = useRouter();
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { createGroupSplit, loading } = useCreateGroupSplit();
    const { recognizeReceipt, loading: ocrLoading } = useOCR();
    const { uploadFile, uploadJSON } = useIPFS();

    const [step, setStep] = useState(1);
    const [friends, setFriends] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [title, setTitle] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [customAddress, setCustomAddress] = useState('');
    const [receiptImage, setReceiptImage] = useState(null);
    const [receiptImagePreview, setReceiptImagePreview] = useState(null);
    const [ocrResult, setOcrResult] = useState(null);

    useEffect(() => {
        if (isOpen && publicKey) {
            fetchFriends();
        }
    }, [isOpen, publicKey]);

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setTitle('');
            setTotalAmount('');
            setSelectedFriends([]);
            setReceiptImage(null);
            setReceiptImagePreview(null);
            setOcrResult(null);
        }
    }, [isOpen]);

    const fetchFriends = async () => {
        setLoadingFriends(true);
        try {
            const program = getProgram(wallet);
            const friendsList = await getFriendsList(program, publicKey);
            const acceptedFriends = friendsList.filter(f => f.status?.accepted);
            const friendsWithProfiles = await Promise.all(
                acceptedFriends.map(async (friend) => {
                    const friendAddr = friend.userA.toString() === publicKey.toString()
                        ? friend.userB.toString() : friend.userA.toString();
                    try {
                        const response = await fetch(`/api/profile?walletAddress=${friendAddr}`);
                        const data = await response.json();
                        return {
                            address: friendAddr,
                            username: data.success && data.exists ? data.profile.username : null,
                            displayName: data.success && data.exists ? data.profile.displayName : null,
                            avatar: data.success && data.exists ? data.profile.avatar : null,
                        };
                    } catch {
                        return { address: friendAddr, username: null, displayName: null, avatar: null };
                    }
                })
            );
            setFriends(friendsWithProfiles);
        } catch (err) {
            console.error('Error fetching friends:', err);
        } finally {
            setLoadingFriends(false);
        }
    };

    const toggleFriend = (friendAddress) => {
        setSelectedFriends(prev =>
            prev.includes(friendAddress)
                ? prev.filter(addr => addr !== friendAddress)
                : [...prev, friendAddress]
        );
    };

    const addCustomAddress = () => {
        if (customAddress && !selectedFriends.includes(customAddress)) {
            setSelectedFriends(prev => [...prev, customAddress]);
            setCustomAddress('');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setReceiptImagePreview(e.target.result);
        reader.readAsDataURL(file);
        setReceiptImage(file);
        toast.info('Scanning receipt...');
        const result = await recognizeReceipt(file);
        if (result.success) {
            setOcrResult(result.result);
            if (result.result.storeName) setTitle(result.result.storeName);
            if (result.result.total) {
                const solAmount = (result.result.total * 0.01).toFixed(2);
                setTotalAmount(solAmount);
            }
            toast.success('Receipt scanned!');
        } else {
            toast.error('Scan failed');
        }
    };

    const handleSubmit = async () => {
        if (selectedFriends.length === 0) {
            toast.error('Please select at least one member');
            return;
        }
        try {
            let imageHash = '';
            let dataHash = '';
            if (receiptImage) {
                const imageResult = await uploadFile(receiptImage);
                if (imageResult.success) imageHash = imageResult.ipfsHash;
            }
            if (ocrResult || receiptImage) {
                const billData = { title, totalAmount: parseFloat(totalAmount), ocrResult, imageHash, createdAt: Date.now() };
                const jsonResult = await uploadJSON(billData, { name: `bill-${Date.now()}.json` });
                if (jsonResult.success) dataHash = jsonResult.ipfsHash;
            }
            toast.info('Creating bill...');
            const result = await createGroupSplit({
                title,
                totalAmount: parseFloat(totalAmount),
                members: selectedFriends,
                ipfsHash: dataHash || 'QmDefault',
            });
            toast.success('Bill created!');
            onClose();
            router.push(`/group-split/${result.groupSplitPDA}`);
        } catch (err) {
            toast.error('Failed: ' + err.message);
        }
    };

    const amountPerPerson = totalAmount && selectedFriends.length > 0
        ? (parseFloat(totalAmount) / selectedFriends.length).toFixed(4) : '0';
    const canProceed = step === 1 ? (title && totalAmount) : step === 2 ? selectedFriends.length > 0 : true;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 p-6 text-white relative">
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30">
                            <X className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-2xl"><Sparkles className="h-6 w-6" /></div>
                            <div>
                                <h2 className="text-2xl font-bold">Create New Bill</h2>
                                <p className="text-white/80 text-sm">Split expenses with friends</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-white text-purple-600' : 'bg-white/30'}`}>
                                        {step > s ? <Check className="h-4 w-4" /> : s}
                                    </div>
                                    {s < 3 && <div className={`w-12 h-1 mx-1 rounded-full ${step > s ? 'bg-white' : 'bg-white/30'}`} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                            <Camera className="h-4 w-4 text-purple-500" />Upload Receipt (Optional)
                                        </label>
                                        {!receiptImagePreview ? (
                                            <label className="block cursor-pointer">
                                                <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-all">
                                                    <Upload className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                                                    <p className="text-gray-600 text-sm">Click to upload</p>
                                                </div>
                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={ocrLoading} />
                                            </label>
                                        ) : (
                                            <div className="relative">
                                                <img src={receiptImagePreview} alt="Receipt" className="w-full h-32 object-cover rounded-2xl" />
                                                <button type="button" onClick={() => { setReceiptImage(null); setReceiptImagePreview(null); setOcrResult(null); }} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                        {ocrLoading && <div className="text-center py-3"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" /></div>}
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><FileText className="h-4 w-4 text-purple-500" />Bill Title</label>
                                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Dinner Party" maxLength={64} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><DollarSign className="h-4 w-4 text-purple-500" />Total Amount (SOL)</label>
                                        <input type="number" step="0.01" min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all text-2xl font-bold text-center" />
                                    </div>
                                </motion.div>
                            )}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Users className="h-4 w-4 text-purple-500" />Select Members</label>
                                        <span className="text-xs text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded-full">{selectedFriends.length} selected</span>
                                    </div>
                                    {loadingFriends ? (
                                        <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" /></div>
                                    ) : friends.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4 text-sm">No friends yet. Add wallet address below.</p>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto space-y-2">
                                            {friends.map((friend) => (
                                                <button key={friend.address} type="button" onClick={() => toggleFriend(friend.address)} className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${selectedFriends.includes(friend.address) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                                                        {friend.avatar ? <img src={getAvatarPath(friend.avatar)} alt="" className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-white" />}
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <p className="font-medium text-gray-800 text-sm">{friend.displayName || friend.username || 'Anonymous'}</p>
                                                        <p className="text-xs text-gray-500 font-mono">{friend.address.slice(0, 6)}...{friend.address.slice(-4)}</p>
                                                    </div>
                                                    {selectedFriends.includes(friend.address) && <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"><Check className="h-4 w-4 text-white" /></div>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-2">
                                        <input type="text" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} placeholder="Enter wallet address" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-mono focus:border-purple-500" />
                                        <button type="button" onClick={addCustomAddress} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200">Add</button>
                                    </div>
                                </motion.div>
                            )}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-200">
                                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" />Bill Summary</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between"><span className="text-gray-600">Title</span><span className="font-semibold">{title}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-bold text-2xl text-purple-600">{totalAmount} SOL</span></div>
                                            <div className="flex justify-between"><span className="text-gray-600">Members</span><span className="font-semibold">{selectedFriends.length}</span></div>
                                            <div className="border-t border-purple-200 pt-3"><div className="flex justify-between"><span className="text-gray-600">Per Person</span><span className="font-bold text-xl text-pink-600">{amountPerPerson} SOL</span></div></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFriends.map((addr) => {
                                            const friend = friends.find(f => f.address === addr);
                                            return (
                                                <div key={addr} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full text-sm border shadow-sm">
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                                                    <span className="font-medium text-gray-700">{friend?.displayName || `${addr.slice(0, 4)}...`}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-gray-50 flex gap-3">
                        {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100">Back</button>}
                        {step < 3 ? (
                            <button onClick={() => setStep(step + 1)} disabled={!canProceed} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50">Continue</button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50">
                                {loading ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating...</span> : '🎉 Create Bill'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { SolanaConnectButton } from '@/components/solana-connect-button';
import { useCreateGroupSplit } from '@/lib/solana/hooks/useGroupSplit';
import { getFriendsList } from '@/lib/solana/hooks/useSocialProgram';
import { getProgram } from '@/lib/solana/anchorSetup';
import { useOCR } from '@/hooks/useOCR';
import { useIPFS } from '@/hooks/useIPFS';
import { User, Check, Upload, Camera, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';

const getAvatarPath = (name) => name ? `/avatar/${name}` : null;

export default function CreateGroupSplitPage() {
    const router = useRouter();
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { createGroupSplit, loading } = useCreateGroupSplit();

    const { recognizeReceipt, loading: ocrLoading } = useOCR();
    const { uploadFile, uploadJSON } = useIPFS();

    const [friends, setFriends] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [title, setTitle] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [customAddress, setCustomAddress] = useState('');
    const [focusedField, setFocusedField] = useState(null);

    // OCR 相关状态
    const [receiptImage, setReceiptImage] = useState(null);
    const [receiptImagePreview, setReceiptImagePreview] = useState(null);
    const [ocrResult, setOcrResult] = useState(null);
    const [showOCRDetails, setShowOCRDetails] = useState(false);

    useEffect(() => {
        if (publicKey) {
            fetchFriends();
        }
    }, [publicKey]);

    const fetchFriends = async () => {
        setLoadingFriends(true);
        try {
            const program = getProgram(wallet);
            const friendsList = await getFriendsList(program, publicKey);

            console.log('Raw friends list:', friendsList);

            // 只显示已接受的好友
            const acceptedFriends = friendsList.filter(f => f.status?.accepted);

            console.log('Accepted friends:', acceptedFriends);

            // 获取每个好友的个人资料
            const friendsWithProfiles = await Promise.all(
                acceptedFriends.map(async (friend) => {
                    const friendAddr = friend.userA.toString() === publicKey.toString()
                        ? friend.userB.toString()
                        : friend.userA.toString();

                    try {
                        const response = await fetch(`/api/profile?walletAddress=${friendAddr}`);
                        const data = await response.json();

                        return {
                            address: friendAddr,
                            username: data.success && data.exists ? data.profile.username : null,
                            displayName: data.success && data.exists ? data.profile.displayName : null,
                            avatar: data.success && data.exists ? data.profile.avatar : null,
                        };
                    } catch (err) {
                        return {
                            address: friendAddr,
                            username: null,
                            displayName: null,
                            avatar: null,
                        };
                    }
                })
            );

            console.log('Friends with profiles:', friendsWithProfiles);
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

        // 预览图片
        const reader = new FileReader();
        reader.onload = (e) => setReceiptImagePreview(e.target.result);
        reader.readAsDataURL(file);

        setReceiptImage(file);

        // OCR 识别
        toast.info('正在识别账单...');
        const result = await recognizeReceipt(file);

        if (result.success) {
            setOcrResult(result.result);

            // 自动填充表单
            if (result.result.storeName) {
                setTitle(result.result.storeName);
            }
            if (result.result.total) {
                // 转换为 SOL (假设 1 USD = 0.01 SOL)
                const solAmount = (result.result.total * 0.01).toFixed(2);
                setTotalAmount(solAmount);
            }

            toast.success('识别成功！请确认信息');
        } else {
            toast.error('识别失败: ' + result.error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedFriends.length === 0) {
            toast.error('请至少选择一个成员');
            return;
        }

        if (selectedFriends.length > 20) {
            toast.error('最多支持 20 个成员');
            return;
        }

        try {
            let imageHash = '';
            let dataHash = '';

            // 上传图片到 IPFS
            if (receiptImage) {
                toast.info('上传账单照片到 IPFS...');
                const imageResult = await uploadFile(receiptImage);
                if (imageResult.success) {
                    imageHash = imageResult.ipfsHash;
                }
            }

            // 上传账单数据到 IPFS
            if (ocrResult || receiptImage) {
                const billData = {
                    title,
                    totalAmount: parseFloat(totalAmount),
                    ocrResult,
                    imageHash,
                    createdAt: Date.now(),
                };

                const jsonResult = await uploadJSON(billData, {
                    name: `bill-${Date.now()}.json`
                });

                if (jsonResult.success) {
                    dataHash = jsonResult.ipfsHash;
                }
            }

            toast.info('创建账单中...');

            const result = await createGroupSplit({
                title,
                totalAmount: parseFloat(totalAmount),
                members: selectedFriends,
                ipfsHash: dataHash || 'QmDefault',
            });

            toast.success('账单创建成功！');
            router.push(`/group-split/${result.groupSplitPDA}`);
        } catch (err) {
            console.error('Error:', err);
            toast.error('创建失败: ' + err.message);
        }
    };

    const amountPerPerson = totalAmount && selectedFriends.length > 0
        ? (parseFloat(totalAmount) / selectedFriends.length).toFixed(4)
        : '0';

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
                <Navbar />
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-md mx-auto text-center">
                        <h1 className="text-3xl font-bold mb-4">创建分账账单</h1>
                        <p className="text-gray-600 mb-8">请先连接钱包</p>
                        <SolanaConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
            {/* Animated gradient background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />

            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
                <button
                    onClick={() => router.back()}
                    className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
                >
                    <span>←</span>
                    <span>返回</span>
                </button>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08),0_8px_40px_rgb(124,58,237,0.12)] border-2 border-purple-100 p-8">
                    <h1 className="text-3xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            创建分账账单
                        </span>
                    </h1>
                    <p className="text-gray-500 mb-8">与好友分摊费用，轻松管理账单</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 上传账单照片 */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                <Camera className="inline h-4 w-4 mr-1" />
                                上传账单照片 (可选)
                            </label>

                            {!receiptImagePreview ? (
                                <label className="block cursor-pointer">
                                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-purple-500 transition-all">
                                        <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                                        <p className="text-gray-600 mb-1">点击上传账单照片</p>
                                        <p className="text-sm text-gray-400">自动识别账单内容</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={ocrLoading}
                                    />
                                </label>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={receiptImagePreview}
                                        alt="Receipt"
                                        className="w-full max-h-64 object-contain rounded-2xl border-2 border-purple-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReceiptImage(null);
                                            setReceiptImagePreview(null);
                                            setOcrResult(null);
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {ocrLoading && (
                                <div className="text-center py-4">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                                    <p className="mt-2 text-sm text-gray-600">正在识别账单...</p>
                                </div>
                            )}

                            {ocrResult && (
                                <div className="mt-4 bg-purple-50 rounded-2xl p-4 border border-purple-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-semibold text-gray-800">✨ 识别结果</p>
                                        <button
                                            type="button"
                                            onClick={() => setShowOCRDetails(!showOCRDetails)}
                                            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                            {showOCRDetails ? '收起' : '查看详情'}
                                        </button>
                                    </div>
                                    {showOCRDetails && (
                                        <div className="text-sm text-gray-600 space-y-1 mt-2">
                                            {ocrResult.storeName && <p>📍 商家: {ocrResult.storeName}</p>}
                                            {ocrResult.date && <p>📅 日期: {ocrResult.date}</p>}
                                            {ocrResult.items && ocrResult.items.length > 0 && (
                                                <div>
                                                    <p className="font-semibold mt-2">🛒 商品:</p>
                                                    {ocrResult.items.map((item, i) => (
                                                        <p key={i} className="ml-2">• {item.name}: {item.price}</p>
                                                    ))}
                                                </div>
                                            )}
                                            {ocrResult.total && (
                                                <p className="font-semibold mt-2">💰 总计: {ocrResult.total} {ocrResult.currency || ''}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 账单标题 */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                账单标题 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onFocus={() => setFocusedField('title')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="例如: 晚餐聚会"
                                required
                                maxLength={64}
                                className={`w-full px-4 py-3 border-2 rounded-2xl transition-all ${focusedField === 'title'
                                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            />
                        </div>

                        {/* 总金额 */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                总金额 (SOL) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                onFocus={() => setFocusedField('amount')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="1.5"
                                required
                                className={`w-full px-4 py-3 border-2 rounded-2xl transition-all ${focusedField === 'amount'
                                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            />
                        </div>

                        {/* 选择成员 */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                选择成员 <span className="text-red-500">*</span>
                            </label>

                            {loadingFriends ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                                    <p className="mt-2 text-sm text-gray-500">加载好友列表...</p>
                                </div>
                            ) : friends.length === 0 ? (
                                <p className="text-gray-500 mb-4 text-center py-4">你还没有好友，可以手动添加地址</p>
                            ) : (
                                <div className="mb-4 max-h-80 overflow-y-auto space-y-2 p-2">
                                    {friends.map((friend) => {
                                        const isSelected = selectedFriends.includes(friend.address);

                                        return (
                                            <button
                                                key={friend.address}
                                                type="button"
                                                onClick={() => toggleFriend(friend.address)}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all ${isSelected
                                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center overflow-hidden shadow-md flex-shrink-0">
                                                        {friend.avatar ? (
                                                            <img
                                                                src={getAvatarPath(friend.avatar)}
                                                                alt={friend.displayName || friend.username}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <User className="h-6 w-6 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="font-semibold text-gray-800 truncate">
                                                            {friend.displayName || friend.username || 'Anonymous'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 font-mono">
                                                            {friend.address.slice(0, 8)}...{friend.address.slice(-8)}
                                                        </p>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                                                            <Check className="h-4 w-4 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 手动添加地址 */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customAddress}
                                    onChange={(e) => setCustomAddress(e.target.value)}
                                    placeholder="手动输入钱包地址"
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all text-sm font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={addCustomAddress}
                                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-2xl transition-all font-semibold"
                                >
                                    添加
                                </button>
                            </div>
                        </div>

                        {/* 已选成员 */}
                        {selectedFriends.length > 0 && (
                            <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="font-semibold text-gray-800">已选成员 ({selectedFriends.length})</p>
                                    <p className="text-sm text-gray-600">
                                        每人应付: <span className="font-bold text-purple-600 text-lg">{amountPerPerson} SOL</span>
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedFriends.map((addr) => {
                                        const friend = friends.find(f => f.address === addr);
                                        return (
                                            <div
                                                key={addr}
                                                className="flex items-center gap-2 bg-white px-3 py-2 rounded-full text-sm shadow-sm"
                                            >
                                                {friend?.avatar ? (
                                                    <img
                                                        src={getAvatarPath(friend.avatar)}
                                                        alt={friend.displayName || friend.username}
                                                        className="w-6 h-6 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                                                        <User className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                                <span className="font-medium">
                                                    {friend?.displayName || friend?.username || `${addr.slice(0, 4)}...${addr.slice(-4)}`}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFriend(addr)}
                                                    className="text-red-500 hover:text-red-700 font-bold"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 提交按钮 */}
                        <button
                            type="submit"
                            disabled={loading || !title || !totalAmount || selectedFriends.length === 0}
                            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    创建中...
                                </span>
                            ) : (
                                '创建账单'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

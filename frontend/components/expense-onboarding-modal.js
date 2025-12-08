import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, Loader2, X, Check } from 'lucide-react';
import { useInitializeExpenseStats } from '@/lib/solana/hooks/useExpenseProgram';

/**
 * Expense Onboarding Modal
 * 在用户首次连接钱包后询问是否启用 expense tracking
 */
export function ExpenseOnboardingModal() {
    const { publicKey, connected } = useWallet();
    const [showModal, setShowModal] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const { initializeExpenseStats, isLoading } = useInitializeExpenseStats();

    useEffect(() => {
        if (connected && publicKey && !hasChecked) {
            checkIfNeedsOnboarding();
        }
    }, [connected, publicKey]);

    const checkIfNeedsOnboarding = async () => {
        try {
            // 检查 localStorage 是否已经询问过
            const hasAsked = localStorage.getItem(`expense_onboarding_${publicKey.toString()}`);

            if (hasAsked) {
                setHasChecked(true);
                return;
            }

            // 检查是否已经初始化过 expense stats
            const { getProgram } = await import('@/lib/solana/anchorSetup');
            const { getExpenseStatsPDA } = await import('@/lib/solana/pdaHelpers');

            const program = getProgram({ publicKey });
            const [expenseStatsPDA] = getExpenseStatsPDA(publicKey);
            const statsData = await program.account.expenseStats.fetchNullable(expenseStatsPDA);

            if (statsData) {
                // 已经初始化过，不需要询问
                localStorage.setItem(`expense_onboarding_${publicKey.toString()}`, 'completed');
                setHasChecked(true);
            } else {
                // 需要询问用户
                setShowModal(true);
                setHasChecked(true);
            }
        } catch (err) {
            console.error('Error checking expense onboarding:', err);
            // 出错也显示弹窗
            setShowModal(true);
            setHasChecked(true);
        }
    };

    const handleEnableExpenseTracking = async () => {
        try {
            const result = await initializeExpenseStats();

            if (result.success) {
                // 记录已完成
                localStorage.setItem(`expense_onboarding_${publicKey.toString()}`, 'completed');
                setShowModal(false);

                // 显示成功提示
                alert('✅ Expense tracking enabled successfully!');
            } else {
                alert('❌ Failed to enable expense tracking. Please try again later.');
            }
        } catch (err) {
            console.error('Error enabling expense tracking:', err);
            alert('❌ Failed to enable expense tracking. Please try again later.');
        }
    };

    const handleSkip = () => {
        // 记录用户选择跳过
        localStorage.setItem(`expense_onboarding_${publicKey.toString()}`, 'skipped');
        setShowModal(false);
    };

    if (!showModal) return null;

    return (
        <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-md bg-neutral-900 border-2 border-purple-500/30">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <div className="bg-gradient-to-br from-purple-600 to-cyan-600 rounded-full p-2">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        Enable Expense Tracking?
                    </DialogTitle>
                    <DialogDescription className="text-neutral-300 text-base mt-4">
                        Track your spending automatically and get insights into your transaction history.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Features */}
                    <Card className="bg-neutral-800/50 border-neutral-700 p-4">
                        <h3 className="text-white font-semibold mb-3">What you will get:</h3>
                        <ul className="space-y-2 text-sm text-neutral-300">
                            <li className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span>Automatic expense categorization (Dining, Shopping, etc.)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span>Visual spending analytics and charts</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span>Transaction history with filters</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span>All data stored on Solana blockchain</span>
                            </li>
                        </ul>
                    </Card>

                    {/* Note */}
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                        <p className="text-xs text-yellow-200">
                            ⚠️ This requires a one-time transaction to create your expense tracking account on the blockchain.
                            You will need to approve it in your wallet.
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleEnableExpenseTracking}
                            disabled={isLoading}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold h-12"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Enabling...
                                </>
                            ) : (
                                <>
                                    <Check className="h-5 w-5 mr-2" />
                                    Enable Now
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleSkip}
                            disabled={isLoading}
                            variant="outline"
                            className="flex-1 bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white h-12"
                        >
                            <X className="h-5 w-5 mr-2" />
                            Skip for Now
                        </Button>
                    </div>

                    <p className="text-xs text-neutral-500 text-center">
                        You can enable this later from the Expenses page.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

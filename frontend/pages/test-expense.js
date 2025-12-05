import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  useInitializeExpenseStats, 
  useRecordExpense,
  ExpenseCategory 
} from '@/lib/solana/hooks/useExpenseProgram';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const CATEGORIES = [
  { id: 'dining', name: 'Dining', emoji: '🍽️' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎮' },
  { id: 'travel', name: 'Travel', emoji: '✈️' },
  { id: 'gifts', name: 'Gifts', emoji: '🎁' },
  { id: 'bills', name: 'Bills', emoji: '📄' },
  { id: 'other', name: 'Other', emoji: '📦' },
];

export default function TestExpensePage() {
  const { publicKey, connected } = useWallet();
  const { initializeExpenseStats, isLoading: isInitializing } = useInitializeExpenseStats();
  const { recordExpense, isLoading: isRecording } = useRecordExpense();
  
  const [result, setResult] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [category, setCategory] = useState('dining');
  const [description, setDescription] = useState('Test expense');

  const handleInitialize = async () => {
    setResult(null);
    const res = await initializeExpenseStats();
    setResult(res);
  };

  const handleRecordExpense = async () => {
    if (!recipientAddress) {
      setResult({ success: false, error: 'Please enter recipient address' });
      return;
    }

    setResult(null);
    
    // 转换分类
    const categoryKey = category.charAt(0).toUpperCase() + category.slice(1);
    const categoryEnum = ExpenseCategory[categoryKey];
    
    const res = await recordExpense({
      recipientAddress,
      amount: Math.floor(parseFloat(amount) * 1e9), // SOL to lamports
      category: categoryEnum,
      description,
      txSignature: 'test_signature_' + Date.now(),
    });
    
    setResult(res);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Card className="bg-neutral-900 border-neutral-800 p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-neutral-400">To test expense tracking</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-8">🧪 Test Expense Tracking</h1>

        {/* Initialize */}
        <Card className="bg-neutral-900 border-neutral-800 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">1. Initialize Expense Stats</h2>
          <p className="text-neutral-400 mb-4">
            First, initialize your expense tracking account (only needed once)
          </p>
          <Button
            onClick={handleInitialize}
            disabled={isInitializing}
            className="bg-purple-600 hover:bg-purple-700 w-full"
          >
            {isInitializing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Initializing...
              </>
            ) : (
              'Initialize Expense Stats'
            )}
          </Button>
        </Card>

        {/* Record Expense */}
        <Card className="bg-neutral-900 border-neutral-800 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">2. Record Test Expense</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Recipient Address
              </label>
              <Input
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter Solana address"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Amount (SOL)
              </label>
              <Input
                type="number"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Category
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`${
                      category === cat.id
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-neutral-800 hover:bg-neutral-700'
                    }`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                  </Button>
                ))}
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                Selected: {CATEGORIES.find(c => c.id === category)?.name}
              </p>
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you spend on?"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            <Button
              onClick={handleRecordExpense}
              disabled={isRecording}
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              {isRecording ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                'Record Expense'
              )}
            </Button>
          </div>
        </Card>

        {/* Result */}
        {result && (
          <Card className={`p-6 ${
            result.success 
              ? 'bg-green-900/20 border-green-800' 
              : 'bg-red-900/20 border-red-800'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3 className={`font-bold mb-2 ${
                  result.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.success ? 'Success!' : 'Error'}
                </h3>
                {result.success ? (
                  <>
                    <p className="text-neutral-300 mb-2">
                      Transaction completed successfully
                    </p>
                    <a
                      href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm"
                    >
                      View on Solana Explorer →
                    </a>
                  </>
                ) : (
                  <p className="text-neutral-300">{result.error}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-neutral-900 border-neutral-800 p-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-3">📝 Testing Notes</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li>• Initialize your expense stats account first (step 1)</li>
            <li>• You can use any valid Solana address as recipient</li>
            <li>• The transaction signature is mocked for testing</li>
            <li>• Check the expenses page to see your recorded expenses</li>
            <li>• Each expense is stored on-chain and costs a small fee</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

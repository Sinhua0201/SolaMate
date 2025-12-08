import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProgram } from '@/lib/solana/anchorSetup';
import { getExpenseStatsPDA } from '@/lib/solana/pdaHelpers';
import { useInitializeExpenseStats } from '@/lib/solana/hooks/useExpenseProgram';
import { Loader2, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { id: 'dining', name: 'Dining', emoji: '🍽️', color: '#ef4444' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#f59e0b' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎮', color: '#8b5cf6' },
  { id: 'travel', name: 'Travel', emoji: '✈️', color: '#06b6d4' },
  { id: 'gifts', name: 'Gifts', emoji: '🎁', color: '#ec4899' },
  { id: 'bills', name: 'Bills', emoji: '📄', color: '#6b7280' },
  { id: 'other', name: 'Other', emoji: '📦', color: '#10b981' },
];

const TIME_FILTERS = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

export default function ExpensesPage() {
  const { publicKey, connected } = useWallet();
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [needsInit, setNeedsInit] = useState(false);
  const { initializeExpenseStats, isLoading: isInitializing } = useInitializeExpenseStats();

  useEffect(() => {
    if (connected && publicKey) {
      loadExpenseData();
    }
  }, [connected, publicKey, timeFilter, categoryFilter, startDate, endDate]);

  const loadExpenseData = async () => {
    setIsLoading(true);
    setNeedsInit(false);
    try {
      const program = getProgram({ publicKey });
      const [expenseStatsPDA] = getExpenseStatsPDA(publicKey);

      // 获取统计数据
      const statsData = await program.account.expenseStats.fetchNullable(expenseStatsPDA);

      if (statsData) {
        // 账户存在，加载数据
        setStats({
          totalSpent: statsData.totalSpent.toNumber(),
          recordCount: statsData.recordCount.toNumber(),
          diningTotal: statsData.diningTotal.toNumber(),
          shoppingTotal: statsData.shoppingTotal.toNumber(),
          entertainmentTotal: statsData.entertainmentTotal.toNumber(),
          travelTotal: statsData.travelTotal.toNumber(),
          giftsTotal: statsData.giftsTotal.toNumber(),
          billsTotal: statsData.billsTotal.toNumber(),
          otherTotal: statsData.otherTotal.toNumber(),
        });

        // 获取所有消费记录
        const allRecords = await program.account.expenseRecord.all([
          {
            memcmp: {
              offset: 8,
              bytes: publicKey.toBase58(),
            },
          },
        ]);

        const formattedRecords = allRecords.map(r => ({
          publicKey: r.publicKey.toString(),
          owner: r.account.owner.toString(),
          recipient: r.account.recipient.toString(),
          amount: r.account.amount.toNumber(),
          category: Object.keys(r.account.category)[0],
          description: r.account.description,
          timestamp: r.account.timestamp.toNumber() * 1000,
          txSignature: r.account.txSignature,
        }));

        // 应用过滤
        const filtered = filterRecords(formattedRecords);
        setRecords(filtered);
      } else {
        // 账户不存在，显示空数据（不需要初始化）
        console.log('Expense stats not found, showing empty data');
        setStats({
          totalSpent: 0,
          recordCount: 0,
          diningTotal: 0,
          shoppingTotal: 0,
          entertainmentTotal: 0,
          travelTotal: 0,
          giftsTotal: 0,
          billsTotal: 0,
          otherTotal: 0,
        });
        setRecords([]);
      }
    } catch (err) {
      console.error('Error loading expenses:', err);
      if (err.message?.includes('Account does not exist')) {
        // 账户不存在，自动初始化
        console.log('Account does not exist, auto-initializing...');
        await autoInitialize();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 自动初始化
  const autoInitialize = async () => {
    try {
      console.log('Auto-initializing expense stats...');
      const result = await initializeExpenseStats();
      if (result.success) {
        console.log('Expense stats initialized successfully');
        // 初始化成功后，设置空数据
        setStats({
          totalSpent: 0,
          recordCount: 0,
          diningTotal: 0,
          shoppingTotal: 0,
          entertainmentTotal: 0,
          travelTotal: 0,
          giftsTotal: 0,
          billsTotal: 0,
          otherTotal: 0,
        });
        setRecords([]);
        setNeedsInit(false);
      } else {
        console.error('Failed to initialize expense stats:', result.error);
        setNeedsInit(true);
      }
    } catch (err) {
      console.error('Error auto-initializing:', err);
      setNeedsInit(true);
    }
  };

  const handleInitialize = async () => {
    const result = await initializeExpenseStats();
    if (result.success) {
      await loadExpenseData();
    }
  };

  const filterRecords = (allRecords) => {
    let filtered = [...allRecords];

    // 时间过滤
    const now = new Date();
    if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(r => r.timestamp >= weekAgo.getTime());
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filtered = filtered.filter(r => r.timestamp >= monthAgo.getTime());
    } else if (timeFilter === 'year') {
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      filtered = filtered.filter(r => r.timestamp >= yearAgo.getTime());
    } else if (timeFilter === 'custom' && startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      filtered = filtered.filter(r => r.timestamp >= start && r.timestamp <= end);
    }

    // 分类过滤
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category.toLowerCase() === categoryFilter);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  };

  const getCategoryData = () => {
    if (!stats) return [];

    return [
      { category: 'Dining', value: stats.diningTotal, color: '#ef4444' },
      { category: 'Shopping', value: stats.shoppingTotal, color: '#f59e0b' },
      { category: 'Entertainment', value: stats.entertainmentTotal, color: '#8b5cf6' },
      { category: 'Travel', value: stats.travelTotal, color: '#06b6d4' },
      { category: 'Gifts', value: stats.giftsTotal, color: '#ec4899' },
      { category: 'Bills', value: stats.billsTotal, color: '#6b7280' },
      { category: 'Other', value: stats.otherTotal, color: '#10b981' },
    ].filter(item => item.value > 0);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/30 via-transparent to-transparent pointer-events-none" />
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Card className="glass-card p-8 text-center rounded-3xl">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-purple-500" />
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">Connect Your Wallet</h2>
            <p className="text-neutral-500">Track your expenses on the blockchain</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/30 via-transparent to-transparent pointer-events-none" />
      <Navbar />

      <div className="container mx-auto px-4 py-8 relative">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-neutral-800">💰 Expense Tracking</h1>
          {stats && (
            <Button
              onClick={loadExpenseData}
              disabled={isLoading}
              className="glass-button bg-purple-500/30 hover:bg-purple-500/50 border-purple-400/30 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {isLoading || isInitializing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
            <p className="text-neutral-400">
              {isInitializing ? 'Initializing expense tracking...' : 'Loading...'}
            </p>
          </div>
        ) : needsInit ? (
          <Card className="glass-card p-8 text-center rounded-3xl">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">Initialization Failed</h2>
            <p className="text-neutral-500 mb-6">
              Failed to initialize expense tracking automatically. Please try again.
            </p>
            <Button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="glass-button bg-purple-500/30 hover:bg-purple-500/50 border-purple-400/30 rounded-xl"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Initializing...
                </>
              ) : (
                'Retry Initialization'
              )}
            </Button>
          </Card>
        ) : !stats || (stats.totalSpent === 0 && stats.recordCount === 0) ? (
          <Card className="glass-card p-8 text-center rounded-3xl">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-purple-500" />
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">No Expense Data Yet</h2>
            <p className="text-neutral-500 mb-6">
              Start making transfers to automatically track your expenses!
            </p>

            {/* Check if user skipped onboarding */}
            {(() => {
              const onboardingStatus = typeof window !== 'undefined' && publicKey
                ? localStorage.getItem(`expense_onboarding_${publicKey.toString()}`)
                : null;

              if (onboardingStatus === 'skipped') {
                return (
                  <div className="mt-4">
                    <p className="text-sm text-neutral-500 mb-4">
                      You skipped expense tracking setup. Enable it now to start tracking your spending.
                    </p>
                    <Button
                      onClick={handleInitialize}
                      disabled={isInitializing}
                      className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                    >
                      {isInitializing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Enabling...
                        </>
                      ) : (
                        'Enable Expense Tracking'
                      )}
                    </Button>
                  </div>
                );
              }
              return null;
            })()}
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Pie Chart */}
            <div className="lg:col-span-1">
              <Card className="glass-card p-6 rounded-3xl border border-purple-200/50 shadow-xl shadow-purple-500/10">
                <h3 className="text-lg font-bold text-neutral-800 mb-4">Spending by Category</h3>
                <PieChart data={getCategoryData()} />

                {/* Category Legend */}
                <div className="mt-6 space-y-2">
                  {getCategoryData().map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-neutral-600">{item.category}</span>
                      </div>
                      <span className="text-sm font-semibold text-neutral-800">
                        {(item.value / 1e9).toFixed(2)} SOL
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-800 font-bold">Total Spent</span>
                    <span className="text-xl font-bold text-purple-600">
                      {(stats.totalSpent / 1e9).toFixed(2)} SOL
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right: Records List */}
            <div className="lg:col-span-2">
              {/* Filters */}
              <Card className="glass-card p-4 mb-4 rounded-2xl border border-purple-200/50 shadow-lg shadow-purple-500/5">
                <div className="flex flex-wrap gap-2 mb-3">
                  {TIME_FILTERS.map((filter) => (
                    <Button
                      key={filter.id}
                      size="sm"
                      onClick={() => setTimeFilter(filter.id)}
                      className={timeFilter === filter.id 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' 
                        : 'bg-white/60 text-neutral-700 border border-neutral-200 hover:bg-white/80'}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>

                {timeFilter === 'custom' && (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white/60 border-neutral-200 text-neutral-800"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white/60 border-neutral-200 text-neutral-800"
                    />
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => setCategoryFilter('all')}
                    className={categoryFilter === 'all' 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' 
                      : 'bg-white/60 text-neutral-700 border border-neutral-200 hover:bg-white/80'}
                  >
                    All
                  </Button>
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat.id}
                      size="sm"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={categoryFilter === cat.id 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' 
                        : 'bg-white/60 text-neutral-700 border border-neutral-200 hover:bg-white/80'}
                    >
                      {cat.emoji}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Records */}
              <Card className="glass-card p-6 rounded-3xl border border-purple-200/50 shadow-xl shadow-purple-500/10">
                <h3 className="text-lg font-bold text-neutral-800 mb-4">
                  Transaction History ({records.length})
                </h3>

                {records.length === 0 ? (
                  <p className="text-center text-neutral-500 py-8">No transactions found</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {records.map((record) => {
                      const category = CATEGORIES.find(c => c.id === record.category.toLowerCase());
                      return (
                        <div key={record.publicKey} className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-neutral-200/50 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="text-2xl">{category?.emoji || '📦'}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-neutral-800 font-medium">{record.description}</p>
                                <p className="text-sm text-neutral-500">
                                  {category?.name || 'Other'}
                                </p>
                                <p className="text-xs text-neutral-400 mt-1">
                                  {new Date(record.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-500">
                                -{(record.amount / 1e9).toFixed(4)} SOL
                              </p>
                              <a
                                href={`https://explorer.solana.com/tx/${record.txSignature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:underline"
                              >
                                View TX
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PieChart({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full aspect-square flex items-center justify-center bg-neutral-100 rounded-xl border border-neutral-200">
        <p className="text-neutral-500">No data</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const slices = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const x1 = 100 + 90 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 100 + 90 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 100 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 100 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);

    const largeArc = angle > 180 ? 1 : 0;
    const path = `M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`;

    currentAngle = endAngle;

    return { ...item, path, percentage, index };
  });

  const hoveredItem = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="relative w-full aspect-square">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
        {slices.map((slice) => (
          <path
            key={slice.index}
            d={slice.path}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
            className="cursor-pointer transition-all duration-200"
            style={{
              transform: hoveredIndex === slice.index ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: 'center',
              opacity: hoveredIndex !== null && hoveredIndex !== slice.index ? 0.5 : 1,
              filter: hoveredIndex === slice.index ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' : 'none',
            }}
            onMouseEnter={() => setHoveredIndex(slice.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

        {/* Center circle */}
        <circle cx="100" cy="100" r="50" fill="white" className="drop-shadow-md" />

        {hoveredItem ? (
          <>
            <text x="100" y="90" textAnchor="middle" className="fill-neutral-800 text-xs font-bold">
              {hoveredItem.category}
            </text>
            <text x="100" y="108" textAnchor="middle" className="fill-purple-600 text-sm font-bold">
              {(hoveredItem.value / 1e9).toFixed(2)} SOL
            </text>
            <text x="100" y="122" textAnchor="middle" className="fill-neutral-500 text-xs">
              {(hoveredItem.percentage * 100).toFixed(1)}%
            </text>
          </>
        ) : (
          <>
            <text x="100" y="95" textAnchor="middle" className="fill-neutral-800 text-xs font-bold">
              Total
            </text>
            <text x="100" y="110" textAnchor="middle" className="fill-purple-600 text-sm font-bold">
              {(total / 1e9).toFixed(2)}
            </text>
            <text x="100" y="122" textAnchor="middle" className="fill-neutral-500 text-xs">
              SOL
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

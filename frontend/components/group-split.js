import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@solana/wallet-adapter-react';
import { Plus, Trash2, Users, DollarSign, Zap } from 'lucide-react';

/**
 * Group Split Component
 * 群组 AA 制功能 - 聚餐/活动费用分摊
 */
export function GroupSplit() {
    const { publicKey, connected } = useWallet();
    const [groupName, setGroupName] = useState('');
    const [members, setMembers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [newMember, setNewMember] = useState('');
    const [newExpense, setNewExpense] = useState({ payer: '', amount: '', description: '' });

    const addMember = () => {
        if (newMember.trim() && !members.includes(newMember.trim())) {
            setMembers([...members, newMember.trim()]);
            setNewMember('');
        }
    };

    const removeMember = (member) => {
        setMembers(members.filter(m => m !== member));
        setExpenses(expenses.filter(e => e.payer !== member));
    };

    const addExpense = () => {
        if (newExpense.payer && newExpense.amount && newExpense.description) {
            setExpenses([
                ...expenses,
                {
                    id: Date.now(),
                    payer: newExpense.payer,
                    amount: parseFloat(newExpense.amount),
                    description: newExpense.description,
                }
            ]);
            setNewExpense({ payer: '', amount: '', description: '' });
        }
    };

    const removeExpense = (id) => {
        setExpenses(expenses.filter(e => e.id !== id));
    };

    // 计算每个人应该付多少
    const calculateSplit = () => {
        if (members.length === 0) return {};

        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
        const perPerson = totalAmount / members.length;

        const balances = {};
        members.forEach(member => {
            const paid = expenses
                .filter(e => e.payer === member)
                .reduce((sum, e) => sum + e.amount, 0);
            balances[member] = paid - perPerson;
        });

        return balances;
    };

    // 计算谁应该给谁转账
    const calculateTransfers = () => {
        const balances = calculateSplit();
        const transfers = [];

        const debtors = Object.entries(balances)
            .filter(([_, balance]) => balance < 0)
            .map(([member, balance]) => ({ member, amount: -balance }))
            .sort((a, b) => b.amount - a.amount);

        const creditors = Object.entries(balances)
            .filter(([_, balance]) => balance > 0)
            .map(([member, balance]) => ({ member, amount: balance }))
            .sort((a, b) => b.amount - a.amount);

        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const amount = Math.min(debtor.amount, creditor.amount);

            if (amount > 0.001) {
                transfers.push({
                    from: debtor.member,
                    to: creditor.member,
                    amount: amount,
                });
            }

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.001) i++;
            if (creditor.amount < 0.001) j++;
        }

        return transfers;
    };

    const balances = calculateSplit();
    const transfers = calculateTransfers();
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="space-y-6">
            {/* Group Info */}
            <Card className="bg-neutral-900 border-neutral-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-purple-600 to-cyan-600 rounded-full p-2">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <Input
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Group name (e.g., Weekend Trip)"
                            className="bg-neutral-800 border-neutral-700 text-white text-lg font-semibold"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-purple-400">{members.length}</p>
                        <p className="text-xs text-neutral-400">Members</p>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-cyan-400">{expenses.length}</p>
                        <p className="text-xs text-neutral-400">Expenses</p>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-400">{totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-neutral-400">Total SOL</p>
                    </div>
                </div>
            </Card>

            {/* Add Members */}
            <Card className="bg-neutral-900 border-neutral-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Members</h3>

                <div className="flex gap-2 mb-4">
                    <Input
                        value={newMember}
                        onChange={(e) => setNewMember(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addMember()}
                        placeholder="Member name or wallet address"
                        className="flex-1 bg-neutral-800 border-neutral-700 text-white"
                    />
                    <Button onClick={addMember} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-2">
                    {members.map((member) => (
                        <div
                            key={member}
                            className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-3"
                        >
                            <span className="text-white">{member}</span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMember(member)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {members.length === 0 && (
                        <p className="text-center text-neutral-500 py-4">No members yet</p>
                    )}
                </div>
            </Card>

            {/* Add Expenses */}
            <Card className="bg-neutral-900 border-neutral-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Expenses</h3>

                <div className="space-y-3 mb-4">
                    <select
                        value={newExpense.payer}
                        onChange={(e) => setNewExpense({ ...newExpense, payer: e.target.value })}
                        className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2"
                        disabled={members.length === 0}
                    >
                        <option value="">Who paid?</option>
                        {members.map(member => (
                            <option key={member} value={member}>{member}</option>
                        ))}
                    </select>

                    <Input
                        type="number"
                        step="0.01"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        placeholder="Amount (SOL)"
                        className="bg-neutral-800 border-neutral-700 text-white"
                    />

                    <Input
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addExpense()}
                        placeholder="Description (e.g., Dinner at restaurant)"
                        className="bg-neutral-800 border-neutral-700 text-white"
                    />

                    <Button
                        onClick={addExpense}
                        disabled={!newExpense.payer || !newExpense.amount || !newExpense.description}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                    </Button>
                </div>

                <div className="space-y-2">
                    {expenses.map((expense) => (
                        <div
                            key={expense.id}
                            className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-3"
                        >
                            <div className="flex-1">
                                <p className="text-white font-medium">{expense.description}</p>
                                <p className="text-sm text-neutral-400">
                                    Paid by {expense.payer}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-green-400 font-bold">
                                    {expense.amount.toFixed(2)} SOL
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeExpense(expense.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {expenses.length === 0 && (
                        <p className="text-center text-neutral-500 py-4">No expenses yet</p>
                    )}
                </div>
            </Card>

            {/* Settlement */}
            {members.length > 0 && expenses.length > 0 && (
                <Card className="bg-gradient-to-br from-neutral-900 to-purple-900/20 border-2 border-purple-500/30 p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-green-400" />
                        Settlement Plan
                    </h3>

                    {/* Balances */}
                    <div className="mb-6 space-y-2">
                        <p className="text-sm text-neutral-400 mb-3">Individual Balances:</p>
                        {Object.entries(balances).map(([member, balance]) => (
                            <div
                                key={member}
                                className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-3"
                            >
                                <span className="text-white">{member}</span>
                                <span className={`font-bold ${balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-neutral-400'
                                    }`}>
                                    {balance > 0 ? '+' : ''}{balance.toFixed(2)} SOL
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Transfers */}
                    <div className="space-y-3">
                        <p className="text-sm text-neutral-400 mb-3">Required Transfers:</p>
                        {transfers.map((transfer, index) => (
                            <div
                                key={index}
                                className="bg-neutral-800/50 rounded-lg p-4 border border-purple-500/30"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">{transfer.from}</span>
                                        <span className="text-neutral-500">→</span>
                                        <span className="text-white font-medium">{transfer.to}</span>
                                    </div>
                                    <span className="text-purple-400 font-bold">
                                        {transfer.amount.toFixed(2)} SOL
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                                    onClick={() => {
                                        alert(`Transfer ${transfer.amount.toFixed(2)} SOL from ${transfer.from} to ${transfer.to}`);
                                        // 这里可以调用实际的转账函数
                                    }}
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Execute Transfer
                                </Button>
                            </div>
                        ))}
                    </div>

                    {transfers.length === 0 && (
                        <div className="text-center py-6">
                            <p className="text-green-400 font-semibold text-lg">✓ All settled!</p>
                            <p className="text-neutral-400 text-sm mt-1">Everyone has paid their share</p>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}

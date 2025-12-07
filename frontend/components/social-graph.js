import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Users, TrendingUp, ArrowRight } from 'lucide-react';

/**
 * Social Graph Component
 * 社交图谱可视化 - 展示转账关系网络
 */
export function SocialGraph({ transactions = [] }) {
    const [graphData, setGraphData] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);

    useEffect(() => {
        if (transactions.length > 0) {
            processTransactions(transactions);
        }
    }, [transactions]);

    const processTransactions = (txs) => {
        // 统计每个地址的转账次数和金额
        const nodes = {};
        const links = [];

        txs.forEach(tx => {
            // 发送方
            if (!nodes[tx.from]) {
                nodes[tx.from] = {
                    id: tx.from,
                    name: tx.fromName || shortenAddress(tx.from),
                    totalSent: 0,
                    totalReceived: 0,
                    count: 0,
                };
            }
            nodes[tx.from].totalSent += tx.amount;
            nodes[tx.from].count++;

            // 接收方
            if (!nodes[tx.to]) {
                nodes[tx.to] = {
                    id: tx.to,
                    name: tx.toName || shortenAddress(tx.to),
                    totalSent: 0,
                    totalReceived: 0,
                    count: 0,
                };
            }
            nodes[tx.to].totalReceived += tx.amount;

            // 连接
            const linkId = `${tx.from}-${tx.to}`;
            const existingLink = links.find(l => l.id === linkId);
            if (existingLink) {
                existingLink.value += tx.amount;
                existingLink.count++;
            } else {
                links.push({
                    id: linkId,
                    source: tx.from,
                    target: tx.to,
                    value: tx.amount,
                    count: 1,
                });
            }
        });

        setGraphData({
            nodes: Object.values(nodes),
            links,
        });
    };

    const shortenAddress = (address) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    // 简化版可视化 - 使用 CSS 而不是 D3.js
    const renderSimpleGraph = () => {
        if (!graphData || graphData.nodes.length === 0) {
            return (
                <div className="flex items-center justify-center h-64 text-neutral-500">
                    No transaction data yet
                </div>
            );
        }

        // 找出最活跃的节点
        const topNodes = graphData.nodes
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return (
            <div className="space-y-4">
                {topNodes.map((node, index) => (
                    <div
                        key={node.id}
                        className="bg-neutral-800/50 rounded-lg p-4 hover:bg-neutral-800 transition-colors cursor-pointer"
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${index === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                                            index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700' :
                                                'bg-gradient-to-br from-purple-600 to-cyan-600'
                                    }`}>
                                    <Users className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold">{node.name}</p>
                                    <p className="text-xs text-neutral-400">{node.count} transactions</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center gap-2 text-green-400">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="font-semibold">
                                        {(node.totalReceived / 1e9).toFixed(2)} SOL
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-red-400 text-sm">
                                    <ArrowRight className="h-3 w-3" />
                                    <span>{(node.totalSent / 1e9).toFixed(2)} SOL</span>
                                </div>
                            </div>
                        </div>

                        {hoveredNode?.id === node.id && (
                            <div className="mt-3 pt-3 border-t border-neutral-700">
                                <p className="text-xs text-neutral-400">
                                    Net: {((node.totalReceived - node.totalSent) / 1e9).toFixed(2)} SOL
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card className="bg-neutral-900 border-neutral-800 p-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Social Network</h3>
                <p className="text-sm text-neutral-400">
                    Your most frequent transaction partners
                </p>
            </div>

            {renderSimpleGraph()}

            {graphData && graphData.nodes.length > 0 && (
                <div className="mt-6 pt-6 border-t border-neutral-800">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-purple-400">
                                {graphData.nodes.length}
                            </p>
                            <p className="text-xs text-neutral-400">Contacts</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cyan-400">
                                {graphData.links.length}
                            </p>
                            <p className="text-xs text-neutral-400">Connections</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-400">
                                {graphData.links.reduce((sum, l) => sum + l.count, 0)}
                            </p>
                            <p className="text-xs text-neutral-400">Total TXs</p>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

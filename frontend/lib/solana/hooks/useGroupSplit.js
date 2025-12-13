/**
 * Group Split Hooks
 * 分账系统相关的 React Hooks
 */

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getProgram } from '../anchorSetup';
import { SOLAMATE_PROGRAM_ID } from '../programIds';

/**
 * Hook: 创建分账群组
 */
export function useCreateGroupSplit() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const createGroupSplit = async ({ title, totalAmount, members, ipfsHash = 'QmDefault' }) => {
        if (!wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        setLoading(true);
        setError(null);

        try {
            const program = getProgram(wallet);
            const timestamp = Math.floor(Date.now() / 1000);

            // 计算 Group Split PDA
            const [groupSplitPDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('group_split'),
                    wallet.publicKey.toBuffer(),
                    new BN(timestamp).toArrayLike(Buffer, 'le', 8),
                ],
                new PublicKey(SOLAMATE_PROGRAM_ID)
            );

            const amountLamports = new BN(totalAmount * LAMPORTS_PER_SOL);

            // 创建分账群组
            const tx = await program.methods
                .createGroupSplit(
                    title,
                    amountLamports,
                    members.length,
                    ipfsHash,
                    new BN(timestamp)
                )
                .accounts({
                    groupSplit: groupSplitPDA,
                    creator: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('Group split created:', tx);

            // 添加成员
            const memberTxs = [];
            for (const memberAddr of members) {
                const memberPubkey = new PublicKey(memberAddr);

                const [splitMemberPDA] = await PublicKey.findProgramAddress(
                    [
                        Buffer.from('split_member'),
                        groupSplitPDA.toBuffer(),
                        memberPubkey.toBuffer(),
                    ],
                    new PublicKey(SOLAMATE_PROGRAM_ID)
                );

                const memberTx = await program.methods
                    .addSplitMember(memberPubkey)
                    .accounts({
                        groupSplit: groupSplitPDA,
                        splitMember: splitMemberPDA,
                        creator: wallet.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                memberTxs.push(memberTx);
                console.log(`Member ${memberAddr} added:`, memberTx);
            }

            setLoading(false);
            return {
                groupSplitPDA: groupSplitPDA.toString(),
                transaction: tx,
                memberTransactions: memberTxs,
            };
        } catch (err) {
            console.error('Error creating group split:', err);
            setError(err.message);
            setLoading(false);
            throw err;
        }
    };

    return { createGroupSplit, loading, error };
}

/**
 * Hook: 标记付款
 */
export function useMarkSplitPaid() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const markPaid = async (groupSplitAddress, memberAddress) => {
        if (!wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        setLoading(true);
        setError(null);

        try {
            const program = getProgram(wallet);
            const groupSplitPDA = new PublicKey(groupSplitAddress);
            const memberPubkey = new PublicKey(memberAddress);

            // 获取 Group Split 数据
            const groupSplitData = await program.account.groupSplit.fetch(groupSplitPDA);

            // 计算 Split Member PDA
            const [splitMemberPDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('split_member'),
                    groupSplitPDA.toBuffer(),
                    memberPubkey.toBuffer(),
                ],
                new PublicKey(SOLAMATE_PROGRAM_ID)
            );

            const tx = await program.methods
                .markSplitPaid()
                .accounts({
                    groupSplit: groupSplitPDA,
                    splitMember: splitMemberPDA,
                    payer: wallet.publicKey,
                })
                .rpc();

            console.log('Marked as paid:', tx);
            setLoading(false);
            return tx;
        } catch (err) {
            console.error('Error marking as paid:', err);
            setError(err.message);
            setLoading(false);
            throw err;
        }
    };

    return { markPaid, loading, error };
}

/**
 * Hook: 获取用户的所有分账群组
 */
export function useUserGroupSplits() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [splits, setSplits] = useState([]);

    const fetchSplits = async () => {
        if (!wallet.publicKey) return;

        setLoading(true);
        try {
            const program = getProgram(wallet);

            // 获取所有 GroupSplit 账户
            const allSplits = await program.account.groupSplit.all();

            // 获取用户相关的分账（作为成员或创建者）
            const userSplits = [];
            for (const split of allSplits) {
                // 检查是否是创建者
                const isCreator = split.account.creator.toString() === wallet.publicKey.toString();

                if (isCreator) {
                    // 如果是创建者，直接添加
                    userSplits.push({
                        ...split,
                        memberData: null, // 创建者可能没有 memberData
                        splitMemberPDA: null,
                        isCreator: true,
                    });
                } else {
                    // 检查是否是成员
                    try {
                        const [splitMemberPDA] = await PublicKey.findProgramAddress(
                            [
                                Buffer.from('split_member'),
                                split.publicKey.toBuffer(),
                                wallet.publicKey.toBuffer(),
                            ],
                            new PublicKey(SOLAMATE_PROGRAM_ID)
                        );

                        const memberData = await program.account.splitMember.fetch(splitMemberPDA);
                        userSplits.push({
                            ...split,
                            memberData,
                            splitMemberPDA: splitMemberPDA.toString(),
                            isCreator: false,
                        });
                    } catch (err) {
                        // 用户既不是创建者也不是成员
                    }
                }
            }

            setSplits(userSplits);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching splits:', err);
            setLoading(false);
        }
    };

    return { splits, loading, fetchSplits };
}

/**
 * Hook: 获取分账详情（包含所有成员）
 */
export function useGroupSplitDetails(groupSplitAddress) {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState(null);

    const fetchDetails = async () => {
        if (!groupSplitAddress || !wallet.publicKey) return;

        setLoading(true);
        try {
            const program = getProgram(wallet);
            const groupSplitPDA = new PublicKey(groupSplitAddress);

            // 获取 Group Split 数据
            const splitData = await program.account.groupSplit.fetch(groupSplitPDA);

            // 获取所有 SplitMember 账户
            const allMembers = await program.account.splitMember.all([
                {
                    memcmp: {
                        offset: 8, // 跳过 discriminator
                        bytes: groupSplitPDA.toBase58(),
                    },
                },
            ]);

            setDetails({
                address: groupSplitAddress,
                data: splitData,
                members: allMembers,
            });
            setLoading(false);
        } catch (err) {
            console.error('Error fetching split details:', err);
            setLoading(false);
        }
    };

    return { details, loading, fetchDetails };
}

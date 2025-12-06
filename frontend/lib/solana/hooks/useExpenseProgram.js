/**
 * Expense Program Hooks
 * 消费追踪功能相关的 React Hooks
 */

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getProgram } from '../anchorSetup';
import { getExpenseStatsPDA, getExpenseRecordPDA } from '../pdaHelpers';

// 消费分类枚举
export const ExpenseCategory = {
  Dining: { dining: {} },
  Shopping: { shopping: {} },
  Entertainment: { entertainment: {} },
  Travel: { travel: {} },
  Gifts: { gifts: {} },
  Bills: { bills: {} },
  Other: { other: {} },
};

/**
 * 初始化消费统计
 */
export function useInitializeExpenseStats() {
  const wallet = useWallet();
  const { publicKey, sendTransaction, signTransaction } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const initializeExpenseStats = async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const [expenseStatsPDA] = getExpenseStatsPDA(publicKey);

      // 构建交易
      const tx = await program.methods
        .initializeExpenseStats()
        .accounts({
          expenseStats: expenseStatsPDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // 获取最新的 blockhash
      const { blockhash, lastValidBlockHeight } = await program.provider.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // 发送交易
      const signature = await sendTransaction(tx, program.provider.connection);
      
      // 确认交易
      await program.provider.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      console.log('Expense stats initialized:', signature);
      return { success: true, signature };
    } catch (err) {
      console.error('Error initializing expense stats:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { initializeExpenseStats, isLoading, error };
}

/**
 * 记录消费
 */
export function useRecordExpense() {
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const recordExpense = async ({
    recipientAddress,
    amount,
    category,
    description,
    txSignature,
  }) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const [expenseStatsPDA] = getExpenseStatsPDA(publicKey);
      
      // 获取当前记录数量
      const stats = await program.account.expenseStats.fetch(expenseStatsPDA);
      const recordIndex = stats.recordCount;
      
      const [expenseRecordPDA] = getExpenseRecordPDA(publicKey, recordIndex);
      const recipientPubkey = new PublicKey(recipientAddress);

      // 将 amount 转换为 BN 类型
      const amountBN = new BN(amount);
      
      // 构建交易
      const tx = await program.methods
        .recordExpense(
          amountBN,
          category,
          description,
          txSignature
        )
        .accounts({
          expenseRecord: expenseRecordPDA,
          expenseStats: expenseStatsPDA,
          owner: publicKey,
          recipient: recipientPubkey,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // 获取最新的 blockhash
      const { blockhash, lastValidBlockHeight } = await program.provider.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // 发送交易
      const signature = await sendTransaction(tx, program.provider.connection);
      
      // 确认交易
      await program.provider.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      console.log('Expense recorded:', signature);
      return { success: true, signature };
    } catch (err) {
      console.error('Error recording expense:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { recordExpense, isLoading, error };
}

/**
 * 获取消费统计
 */
export async function getExpenseStats(program, userPublicKey) {
  try {
    const [expenseStatsPDA] = getExpenseStatsPDA(userPublicKey);
    const stats = await program.account.expenseStats.fetch(expenseStatsPDA);
    return { ...stats, publicKey: expenseStatsPDA };
  } catch (err) {
    console.error('Error fetching expense stats:', err);
    return null;
  }
}

/**
 * 获取消费历史
 */
export async function getExpenseHistory(program, userPublicKey, limit = 100) {
  try {
    const records = await program.account.expenseRecord.all([
      {
        memcmp: {
          offset: 8, // 跳过 discriminator
          bytes: userPublicKey.toBase58(),
        },
      },
    ]);

    // 按时间排序 (最新的在前)
    const sortedRecords = records
      .map(r => ({
        publicKey: r.publicKey,
        ...r.account,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // 限制数量
    return sortedRecords.slice(0, limit);
  } catch (err) {
    console.error('Error fetching expense history:', err);
    return [];
  }
}

/**
 * AI 自动分类消费
 */
export function categorizeExpense(description) {
  const keywords = {
    dining: ['dinner', 'lunch', 'breakfast', 'food', 'restaurant', 'cafe', 'meal', 'eat'],
    shopping: ['buy', 'purchase', 'shop', 'store', 'mall', 'clothes', 'shopping'],
    entertainment: ['movie', 'game', 'concert', 'fun', 'party', 'entertainment', 'play'],
    travel: ['flight', 'hotel', 'trip', 'vacation', 'uber', 'taxi', 'travel', 'transport'],
    gifts: ['gift', 'present', 'birthday', 'anniversary'],
    bills: ['rent', 'utility', 'phone', 'internet', 'bill', 'payment', 'subscription'],
  };

  const lowerDesc = description.toLowerCase();

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerDesc.includes(word))) {
      return ExpenseCategory[category.charAt(0).toUpperCase() + category.slice(1)];
    }
  }

  return ExpenseCategory.Other;
}

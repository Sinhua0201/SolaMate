/**
 * Anchor Program Setup
 * 初始化 Anchor Program 实例
 */

import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { SOLAMATE_PROGRAM_ID_STRING, RPC_ENDPOINT } from './programIds';
import IDL from './idl/solamate_program.json';

/**
 * 获取 Anchor Program 实例
 * @param {Object} wallet - Solana wallet adapter (from useWallet hook)
 * @returns {Program} Anchor program instance
 */
export function getProgram(wallet) {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // 确保在客户端环境
  if (typeof window === 'undefined') {
    throw new Error('getProgram can only be called on the client side');
  }

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
  // 创建兼容 Anchor 的 wallet adapter
  // Phantom 和其他现代钱包都支持这些方法
  const anchorWallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction?.bind(wallet) || (async (tx) => {
      throw new Error('Wallet does not support signTransaction');
    }),
    signAllTransactions: wallet.signAllTransactions?.bind(wallet) || (async (txs) => {
      if (wallet.signTransaction) {
        const signed = [];
        for (const tx of txs) {
          signed.push(await wallet.signTransaction(tx));
        }
        return signed;
      }
      throw new Error('Wallet does not support signing transactions');
    }),
  };
  
  const provider = new AnchorProvider(
    connection,
    anchorWallet,
    { commitment: 'confirmed' }
  );

  // 在客户端创建 PublicKey
  let programId;
  try {
    programId = new PublicKey(SOLAMATE_PROGRAM_ID_STRING);
  } catch (error) {
    console.error('Invalid Program ID:', SOLAMATE_PROGRAM_ID_STRING);
    throw new Error('Invalid Program ID: ' + error.message);
  }

  const program = new Program(IDL, programId, provider);
  
  return program;
}

/**
 * 获取只读 Program 实例 (不需要钱包)
 * @returns {Program} Anchor program instance
 */
export function getReadOnlyProgram() {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
  // 创建一个假的 provider (只用于读取)
  const provider = {
    connection,
    publicKey: null,
  };

  const programId = new PublicKey(SOLAMATE_PROGRAM_ID_STRING);
  const program = new Program(IDL, programId, provider);
  
  return program;
}

export { IDL };

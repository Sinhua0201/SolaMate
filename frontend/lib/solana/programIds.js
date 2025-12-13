/**
 * Solana Program IDs
 * SolaMate 智能合约地址
 */

import { PublicKey } from '@solana/web3.js';

// 主合约 Program ID (包含所有功能)
export const SOLAMATE_PROGRAM_ID_STRING = 'H5Zs6GVUnjZSTuMwJzBTRRtvFrS1gfSNYtVWzFaxCNiD';

// 延迟初始化 PublicKey (避免 SSR 问题)
export const getSolamateProgramId = () => {
  return new PublicKey(SOLAMATE_PROGRAM_ID_STRING);
};

// 兼容性导出
export const SOLAMATE_PROGRAM_ID = SOLAMATE_PROGRAM_ID_STRING;

// 网络配置
export const NETWORK = 'devnet'; // 'devnet' | 'mainnet-beta'

// RPC 端点
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Explorer 链接
export const getExplorerUrl = (address, type = 'address') => {
  const cluster = NETWORK === 'devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/${type}/${address}${cluster}`;
};

// PDA Seeds (用于计算账户地址)
export const SEEDS = {
  USER_PROFILE: 'user_profile',
  FRIENDSHIP: 'friendship',
  CHAT_ROOM: 'chat_room',
  MESSAGE: 'message',
  EXPENSE_STATS: 'expense_stats',
  EXPENSE_RECORD: 'expense_record',
  FUNDING_EVENT: 'funding_event',
  APPLICATION: 'application',
};

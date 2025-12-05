/**
 * PDA (Program Derived Address) Helper Functions
 * 用于计算 Solana 账户地址
 */

import { PublicKey } from '@solana/web3.js';
import { SOLAMATE_PROGRAM_ID_STRING, SEEDS } from './programIds';

// 获取 Program ID
const getProgramId = () => new PublicKey(SOLAMATE_PROGRAM_ID_STRING);

/**
 * 获取用户档案 PDA
 */
export function getUserProfilePDA(userPublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.USER_PROFILE), userPublicKey.toBuffer()],
    getProgramId()
  );
}

/**
 * 获取好友关系 PDA
 */
export function getFriendshipPDA(userAPublicKey, userBPublicKey) {
  // 确保地址按字母序排列
  const [minKey, maxKey] = 
    userAPublicKey.toString() < userBPublicKey.toString()
      ? [userAPublicKey, userBPublicKey]
      : [userBPublicKey, userAPublicKey];

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.FRIENDSHIP),
      minKey.toBuffer(),
      maxKey.toBuffer()
    ],
    getProgramId()
  );
}

/**
 * 获取聊天室 PDA
 */
export function getChatRoomPDA(userAPublicKey, userBPublicKey) {
  // 确保地址按字母序排列
  const [minKey, maxKey] = 
    userAPublicKey.toString() < userBPublicKey.toString()
      ? [userAPublicKey, userBPublicKey]
      : [userBPublicKey, userAPublicKey];

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.CHAT_ROOM),
      minKey.toBuffer(),
      maxKey.toBuffer()
    ],
    getProgramId()
  );
}

/**
 * 获取消息 PDA
 */
export function getMessagePDA(chatRoomPublicKey, messageIndex) {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(messageIndex));

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.MESSAGE),
      chatRoomPublicKey.toBuffer(),
      indexBuffer
    ],
    getProgramId()
  );
}

/**
 * 获取消费统计 PDA
 */
export function getExpenseStatsPDA(userPublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.EXPENSE_STATS), userPublicKey.toBuffer()],
    getProgramId()
  );
}

/**
 * 获取消费记录 PDA
 */
export function getExpenseRecordPDA(userPublicKey, recordIndex) {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(recordIndex));

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.EXPENSE_RECORD),
      userPublicKey.toBuffer(),
      indexBuffer
    ],
    getProgramId()
  );
}

/**
 * Profile Helper - 从 Solana 链上获取用户 Profile
 * 替代原来的 Firebase API
 */

import { PublicKey } from '@solana/web3.js';
import { getProgram } from './anchorSetup';
import { getUserProfilePDA } from './pdaHelpers';

/**
 * 从链上获取单个用户的 Profile
 * @param {string} walletAddress - 钱包地址
 * @param {object} wallet - wallet adapter (可选，如果没有会创建只读 program)
 * @returns {Promise<{success: boolean, exists: boolean, profile?: object}>}
 */
export async function getProfileFromChain(walletAddress, wallet = null) {
  try {
    const pubkey = new PublicKey(walletAddress);
    const program = getProgram(wallet || { publicKey: pubkey });
    const [userProfilePDA] = getUserProfilePDA(pubkey);

    const profileAccount = await program.account.userProfile.fetchNullable(userProfilePDA);

    if (profileAccount) {
      return {
        success: true,
        exists: true,
        profile: {
          walletAddress: profileAccount.owner.toString(),
          username: profileAccount.username,
          displayName: profileAccount.username,
          avatar: profileAccount.avatar || null,
          petId: profileAccount.petId,
          friendCount: profileAccount.friendCount,
          createdAt: profileAccount.createdAt?.toNumber?.() || profileAccount.createdAt,
        },
      };
    } else {
      return {
        success: true,
        exists: false,
      };
    }
  } catch (error) {
    // RangeError 通常表示账户数据结构不匹配（旧数据）或账户不存在
    if (error.name === 'RangeError' || error.message?.includes('buffer length')) {
      console.log('Profile not found or data mismatch for:', walletAddress);
      return {
        success: true,
        exists: false,
      };
    }
    console.error('Error fetching profile from chain:', error);
    return {
      success: false,
      exists: false,
      error: error.message,
    };
  }
}

/**
 * 批量获取多个用户的 Profile
 * @param {string[]} walletAddresses - 钱包地址数组
 * @param {object} wallet - wallet adapter (可选)
 * @returns {Promise<Map<string, object>>} - 地址到 profile 的映射
 */
export async function getMultipleProfilesFromChain(walletAddresses, wallet = null) {
  const profiles = new Map();

  // 并行获取所有 profiles
  const results = await Promise.allSettled(
    walletAddresses.map(async (address) => {
      const result = await getProfileFromChain(address, wallet);
      return { address, result };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.result.exists) {
      profiles.set(result.value.address, result.value.result.profile);
    }
  }

  return profiles;
}

/**
 * 获取好友的 Profile 信息
 * @param {string} friendAddress - 好友钱包地址
 * @param {object} wallet - wallet adapter (可选)
 * @returns {Promise<object|null>} - 好友 profile 或 null
 */
export async function getFriendProfile(friendAddress, wallet = null) {
  const result = await getProfileFromChain(friendAddress, wallet);
  
  if (result.success && result.exists) {
    return {
      address: friendAddress,
      username: result.profile.username,
      displayName: result.profile.displayName,
      avatar: result.profile.avatar,
    };
  }
  
  return null;
}

/**
 * Social Program Hooks
 * 社交功能相关的 React Hooks
 */

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, PublicKey } from '@solana/web3.js';
import { getProgram } from '../anchorSetup';
import {
  getUserProfilePDA,
  getFriendshipPDA
} from '../pdaHelpers';

/**
 * 初始化用户档案（包含 username 和 avatar）
 */
export function useInitializeProfile() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const initializeProfile = async (username, avatar = '1.png') => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!username || username.length < 3 || username.length > 20) {
      throw new Error('Username must be 3-20 characters');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const [userProfilePDA] = getUserProfilePDA(publicKey);

      const tx = await program.methods
        .initializeProfile(username, avatar)
        .accounts({
          userProfile: userProfilePDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Profile initialized:', tx);
      return { success: true, signature: tx };
    } catch (err) {
      console.error('Error initializing profile:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { initializeProfile, isLoading, error };
}

/**
 * 更新用户档案（username 和 avatar）
 */
export function useUpdateProfile() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateProfile = async (username, avatar) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!username || username.length < 3 || username.length > 20) {
      throw new Error('Username must be 3-20 characters');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const [userProfilePDA] = getUserProfilePDA(publicKey);

      const tx = await program.methods
        .updateProfile(username, avatar)
        .accounts({
          userProfile: userProfilePDA,
          user: publicKey,
        })
        .rpc();

      console.log('Profile updated:', tx);
      return { success: true, signature: tx };
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { updateProfile, isLoading, error };
}

/**
 * 选择宠物
 */
export function useSelectPet() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectPet = async (petId) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (petId < 1 || petId > 10) {
      throw new Error('Pet ID must be between 1 and 10');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const [userProfilePDA] = getUserProfilePDA(publicKey);

      const tx = await program.methods
        .selectPet(petId)
        .accounts({
          userProfile: userProfilePDA,
          user: publicKey,
          owner: publicKey,
        })
        .rpc();

      console.log('Pet selected:', tx);
      return { success: true, signature: tx };
    } catch (err) {
      console.error('Error selecting pet:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { selectPet, isLoading, error };
}

/**
 * 发送好友请求
 */
export function useSendFriendRequest() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendFriendRequest = async (friendPublicKey) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);

      // 检查自己的 profile 是否已初始化
      const [myProfilePDA] = getUserProfilePDA(publicKey);
      const myProfile = await program.account.userProfile.fetchNullable(myProfilePDA);

      if (!myProfile) {
        // Profile 必须先通过 ProfileSetupModal 创建
        throw new Error('Please set up your profile first before adding friends');
      }

      // 排序 keys（合约要求排序后的 keys）
      const [userA, userB] = publicKey.toString() < friendPublicKey.toString()
        ? [publicKey, friendPublicKey]
        : [friendPublicKey, publicKey];

      // 使用排序后的 keys 计算 PDA
      const [friendshipPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('friendship'),
          userA.toBuffer(),
          userB.toBuffer()
        ],
        program.programId
      );

      const tx = await program.methods
        .sendFriendRequest(userA, userB)
        .accounts({
          friendship: friendshipPDA,
          user: publicKey,
          friend: friendPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Friend request sent:', tx);
      return { success: true, signature: tx };
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { sendFriendRequest, isLoading, error };
}

/**
 * 接受好友请求
 */
export function useAcceptFriendRequest() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const acceptFriendRequest = async (friendPublicKey) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);

      // 使用排序后的 keys 计算 PDA（与合约一致）
      const [userA, userB] = publicKey.toString() < friendPublicKey.toString()
        ? [publicKey, friendPublicKey]
        : [friendPublicKey, publicKey];

      const [friendshipPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('friendship'), userA.toBuffer(), userB.toBuffer()],
        program.programId
      );

      // 获取 friendship 账户数据
      const friendshipAccount = await program.account.friendship.fetch(friendshipPDA);

      // 获取 profile PDAs
      const [userAProfilePDA] = getUserProfilePDA(friendshipAccount.userA);
      const [userBProfilePDA] = getUserProfilePDA(friendshipAccount.userB);

      // 尝试接受好友请求
      const tx = await program.methods
        .acceptFriendRequest()
        .accounts({
          friendship: friendshipPDA,
          userAProfile: userAProfilePDA,
          userBProfile: userBProfilePDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Friend request accepted:', tx);
      return { success: true, signature: tx };
    } catch (err) {
      console.error('Error accepting friend request:', err);
      let errorMessage = err.message;

      // 如果是账户未初始化错误，给出清晰提示
      if (err.message && err.message.includes('AccountNotInitialized')) {
        errorMessage = '对方还没有初始化账户。请让对方先连接钱包访问网站，或者等待合约升级后自动初始化。';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return { acceptFriendRequest, isLoading, error };
}

/**
 * 获取用户档案
 */
export async function getUserProfile(program, userPublicKey) {
  try {
    const [userProfilePDA] = getUserProfilePDA(userPublicKey);
    const profile = await program.account.userProfile.fetch(userProfilePDA);
    return profile;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

/**
 * 获取好友列表
 */
export async function getFriendsList(program, userPublicKey) {
  try {
    // 获取所有 friendship，然后在客户端过滤
    // 因为 memcmp 只能匹配一个字段，无法同时匹配 userA 和 userB
    const allFriendships = await program.account.friendship.all();

    // 过滤出包含当前用户的 friendship
    const userFriendships = allFriendships.filter(f => {
      const userAMatch = f.account.userA.toString() === userPublicKey.toString();
      const userBMatch = f.account.userB.toString() === userPublicKey.toString();
      return userAMatch || userBMatch;
    });

    return userFriendships.map(f => ({
      publicKey: f.publicKey,
      ...f.account,
    }));
  } catch (err) {
    console.error('Error fetching friends list:', err);
    return [];
  }
}

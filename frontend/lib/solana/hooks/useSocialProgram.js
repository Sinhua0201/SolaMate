/**
 * Social Program Hooks
 * 社交功能相关的 React Hooks
 */

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram } from '@solana/web3.js';
import { getProgram } from '../anchorSetup';
import { 
  getUserProfilePDA, 
  getFriendshipPDA 
} from '../pdaHelpers';

/**
 * 初始化用户档案
 */
export function useInitializeProfile() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const initializeProfile = async (username) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const [userProfilePDA] = getUserProfilePDA(publicKey);

      const tx = await program.methods
        .initializeProfile(username)
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
        console.log('Initializing your profile first...');
        const initTx = await program.methods
          .initializeProfile()
          .accounts({
            userProfile: myProfilePDA,
            user: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log('Your profile initialized:', initTx);
      }

      const [friendshipPDA] = getFriendshipPDA(publicKey, friendPublicKey);

      const tx = await program.methods
        .sendFriendRequest()
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
      const [friendshipPDA] = getFriendshipPDA(publicKey, friendPublicKey);
      
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
    const friendships = await program.account.friendship.all([
      {
        memcmp: {
          offset: 8, // 跳过 discriminator
          bytes: userPublicKey.toBase58(),
        },
      },
    ]);

    return friendships.map(f => ({
      publicKey: f.publicKey,
      ...f.account,
    }));
  } catch (err) {
    console.error('Error fetching friends list:', err);
    return [];
  }
}

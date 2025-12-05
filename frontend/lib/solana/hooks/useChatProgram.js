/**
 * Chat Program Hooks
 * 聊天功能相关的 React Hooks
 */

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram } from '@solana/web3.js';
import { getProgram } from '../anchorSetup';
import { getChatRoomPDA, getMessagePDA } from '../pdaHelpers';

/**
 * 初始化聊天室
 */
export function useInitializeChatRoom() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const initializeChatRoom = async (friendPublicKey) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const [chatRoomPDA] = getChatRoomPDA(publicKey, friendPublicKey);

      // 检查是否已存在
      const existing = await program.account.chatRoom.fetchNullable(chatRoomPDA);
      if (existing) {
        return { success: true, exists: true, chatRoomPDA };
      }

      // 确保 userA 和 userB 按字母序排列（和 PDA 计算一致）
      const [userA, userB] = publicKey.toString() < friendPublicKey.toString()
        ? [publicKey, friendPublicKey]
        : [friendPublicKey, publicKey];

      const tx = await program.methods
        .initializeChatRoom()
        .accounts({
          chatRoom: chatRoomPDA,
          userA: userA,
          userB: userB,
          payer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Chat room initialized:', tx);
      return { success: true, signature: tx, chatRoomPDA };
    } catch (err) {
      console.error('Error initializing chat room:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { initializeChatRoom, isLoading, error };
}

/**
 * 发送消息
 */
export function useSendMessage() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (friendAddress, content) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!content || content.length === 0 || content.length > 500) {
      throw new Error('Message must be 1-500 characters');
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const friendPublicKey = typeof friendAddress === 'string' 
        ? new (await import('@solana/web3.js')).PublicKey(friendAddress)
        : friendAddress;
      
      const [chatRoomPDA] = getChatRoomPDA(publicKey, friendPublicKey);
      
      // 获取或创建聊天室
      let chatRoom = await program.account.chatRoom.fetchNullable(chatRoomPDA);
      
      if (!chatRoom) {
        console.log('Initializing chat room...');
        
        // 确保 userA 和 userB 按字母序排列（和 PDA 计算一致）
        const [userA, userB] = publicKey.toString() < friendPublicKey.toString()
          ? [publicKey, friendPublicKey]
          : [friendPublicKey, publicKey];
        
        const initTx = await program.methods
          .initializeChatRoom()
          .accounts({
            chatRoom: chatRoomPDA,
            userA: userA,
            userB: userB,
            payer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log('Chat room initialized:', initTx);
        chatRoom = await program.account.chatRoom.fetch(chatRoomPDA);
      }
      
      const messageIndex = chatRoom.messageCount.toNumber();
      const [messagePDA] = getMessagePDA(chatRoomPDA, messageIndex);

      const tx = await program.methods
        .sendMessage(content)
        .accounts({
          chatRoom: chatRoomPDA,
          message: messagePDA,
          sender: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Message sent:', tx);
      return { success: true, signature: tx, messagePDA };
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading, error };
}

/**
 * 获取聊天室信息
 */
export async function getChatRoom(program, userPublicKey, friendPublicKey) {
  try {
    const [chatRoomPDA] = getChatRoomPDA(userPublicKey, friendPublicKey);
    const chatRoom = await program.account.chatRoom.fetch(chatRoomPDA);
    return { ...chatRoom, publicKey: chatRoomPDA };
  } catch (err) {
    console.error('Error fetching chat room:', err);
    return null;
  }
}

/**
 * 获取聊天历史
 */
export async function getChatHistory(program, chatRoomPDA, limit = 50) {
  try {
    const messages = await program.account.message.all([
      {
        memcmp: {
          offset: 8, // 跳过 discriminator
          bytes: chatRoomPDA.toBase58(),
        },
      },
    ]);

    // 按时间排序
    const sortedMessages = messages
      .map(m => ({
        publicKey: m.publicKey,
        ...m.account,
      }))
      .sort((a, b) => a.messageIndex - b.messageIndex);

    // 限制数量
    return sortedMessages.slice(-limit);
  } catch (err) {
    console.error('Error fetching chat history:', err);
    return [];
  }
}

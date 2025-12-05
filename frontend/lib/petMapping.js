/**
 * Pet Mapping System
 * 根据钱包地址生成宠物 ID (1-10)
 * 每个钱包地址对应一个固定的宠物
 */

/**
 * 根据钱包地址计算宠物 ID
 * @param {string} walletAddress - 钱包地址
 * @returns {number} 宠物 ID (1-10)
 */
export function getPetIdFromWallet(walletAddress) {
  if (!walletAddress) return 1;
  
  // 使用钱包地址的哈希值来确定宠物 ID
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    const char = walletAddress.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // 确保结果在 1-10 之间
  return Math.abs(hash % 10) + 1;
}

/**
 * 获取宠物信息
 * @param {number} petId - 宠物 ID (1-10)
 * @returns {Object} 宠物信息
 */
export function getPetInfo(petId) {
  const pets = {
    1: { id: 1, name: 'Puppy', emoji: '🐶', trait: 'Loyal' },
    2: { id: 2, name: 'Kitty', emoji: '🐱', trait: 'Independent' },
    3: { id: 3, name: 'Bunny', emoji: '🐰', trait: 'Active' },
    4: { id: 4, name: 'Bear', emoji: '🐻', trait: 'Strong' },
    5: { id: 5, name: 'Bird', emoji: '🐦', trait: 'Free' },
    6: { id: 6, name: 'Fish', emoji: '🐠', trait: 'Calm' },
    7: { id: 7, name: 'Dragon', emoji: '🐉', trait: 'Powerful' },
    8: { id: 8, name: 'Monkey', emoji: '🐵', trait: 'Smart' },
    9: { id: 9, name: 'Pig', emoji: '🐷', trait: 'Lucky' },
    10: { id: 10, name: 'Fox', emoji: '🦊', trait: 'Clever' },
  };
  
  return pets[petId] || pets[1];
}

/**
 * 获取用户的宠物信息
 * @param {string} walletAddress - 钱包地址
 * @returns {Object} 宠物信息
 */
export function getUserPet(walletAddress) {
  const petId = getPetIdFromWallet(walletAddress);
  return getPetInfo(petId);
}

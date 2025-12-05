/**
 * Pet System - 宠物系统管理
 * 链下数据存储在 localStorage
 */

// 经验值等级表
export const XP_REQUIRED = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 1000,
  6: 2000,
  7: 3500,
  8: 5500,
  9: 8000,
  10: 12000,
};

// 宠物特性加成
export const PET_BONUSES = {
  1: { name: 'Dragon', bonus: 'all', value: 0.15 },
  2: { name: 'Cat', bonus: 'expense', value: 0.20 },
  3: { name: 'Dog', bonus: 'social', value: 0.20 },
  4: { name: 'Pig', bonus: 'lucky', value: 0.10 },
  5: { name: 'Monkey', bonus: 'task', value: 0.40 },
  6: { name: 'Cow', bonus: 'daily', value: 20 },
  7: { name: 'Rabbit', bonus: 'all', value: 0.10 },
  8: { name: 'Tiger', bonus: 'transfer', value: 0.30 },
  9: { name: 'Goat', bonus: 'all', value: 0.10 },
  10: { name: 'Mouse', bonus: 'message', value: 0.50 },
};

// 获取宠物数据
export function getPetData(walletAddress) {
  if (!walletAddress) return null;
  
  const key = `pet_${walletAddress}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    // 初始化默认数据
    const defaultData = {
      level: 1,
      xp: 0,
      totalXp: 0,
      happiness: 100,
      energy: 100,
      lastFed: Date.now(),
      lastPlayed: Date.now(),
      totalInteractions: 0,
      createdAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  
  return JSON.parse(data);
}

// 保存宠物数据
export function savePetData(walletAddress, data) {
  if (!walletAddress) return;
  const key = `pet_${walletAddress}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// 添加经验值
export function addXP(walletAddress, amount, petId) {
  const data = getPetData(walletAddress);
  if (!data) return null;
  
  // 应用宠物加成
  const bonus = PET_BONUSES[petId];
  if (bonus && bonus.bonus === 'all') {
    amount = Math.floor(amount * (1 + bonus.value));
  }
  
  data.xp += amount;
  data.totalXp += amount;
  
  // 检查升级
  const newLevel = calculateLevel(data.xp);
  const leveledUp = newLevel > data.level;
  data.level = newLevel;
  
  savePetData(walletAddress, data);
  
  return { ...data, leveledUp, xpGained: amount };
}

// 计算等级
export function calculateLevel(xp) {
  for (let level = 10; level >= 1; level--) {
    if (xp >= XP_REQUIRED[level]) {
      return level;
    }
  }
  return 1;
}

// 喂食
export function feedPet(walletAddress) {
  const data = getPetData(walletAddress);
  if (!data) return { success: false, message: 'Pet data not found' };
  
  const now = Date.now();
  const timeSinceLastFed = now - data.lastFed;
  const hoursSinceLastFed = timeSinceLastFed / (1000 * 60 * 60);
  
  if (hoursSinceLastFed < 6) {
    const hoursLeft = Math.ceil(6 - hoursSinceLastFed);
    return { 
      success: false, 
      message: `Pet is not hungry yet! Wait ${hoursLeft} more hour(s)` 
    };
  }
  
  data.happiness = Math.min(100, data.happiness + 10);
  data.lastFed = now;
  data.totalInteractions += 1;
  
  savePetData(walletAddress, data);
  
  return { 
    success: true, 
    message: 'Pet fed successfully! +10 Happiness, +5 XP',
    xpGained: 5
  };
}

// 玩耍
export function playWithPet(walletAddress) {
  const data = getPetData(walletAddress);
  if (!data) return { success: false, message: 'Pet data not found' };
  
  const now = Date.now();
  const timeSinceLastPlayed = now - data.lastPlayed;
  const hoursSinceLastPlayed = timeSinceLastPlayed / (1000 * 60 * 60);
  
  if (hoursSinceLastPlayed < 4) {
    const hoursLeft = Math.ceil(4 - hoursSinceLastPlayed);
    return { 
      success: false, 
      message: `Pet is tired! Wait ${hoursLeft} more hour(s)` 
    };
  }
  
  data.energy = Math.min(100, data.energy + 10);
  data.happiness = Math.min(100, data.happiness + 5);
  data.lastPlayed = now;
  data.totalInteractions += 1;
  
  savePetData(walletAddress, data);
  
  return { 
    success: true, 
    message: 'Played with pet! +10 Energy, +5 Happiness, +10 XP',
    xpGained: 10
  };
}

// 更新快乐值和能量值（每次加载时检查）
export function updatePetStatus(walletAddress) {
  const data = getPetData(walletAddress);
  if (!data) return null;
  
  const now = Date.now();
  const hoursSinceLastFed = (now - data.lastFed) / (1000 * 60 * 60);
  
  // 超过12小时未喂食，快乐值下降
  if (hoursSinceLastFed > 12) {
    const decreaseAmount = Math.floor((hoursSinceLastFed - 12) / 12) * 20;
    data.happiness = Math.max(0, data.happiness - decreaseAmount);
  }
  
  savePetData(walletAddress, data);
  return data;
}

// 获取每日任务
export function getDailyTasks(walletAddress) {
  const key = `tasks_${walletAddress}_${new Date().toDateString()}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    const defaultTasks = [
      { id: 1, title: 'Send 5 messages', reward: 30, progress: 0, target: 5, type: 'message' },
      { id: 2, title: 'Complete 3 transfers', reward: 50, progress: 0, target: 3, type: 'transfer' },
      { id: 3, title: 'Feed your pet', reward: 10, progress: 0, target: 1, type: 'feed' },
    ];
    localStorage.setItem(key, JSON.stringify(defaultTasks));
    return defaultTasks;
  }
  
  return JSON.parse(data);
}

// 更新任务进度
export function updateTaskProgress(walletAddress, taskType) {
  const tasks = getDailyTasks(walletAddress);
  const task = tasks.find(t => t.type === taskType);
  
  if (task && task.progress < task.target) {
    task.progress += 1;
    
    const key = `tasks_${walletAddress}_${new Date().toDateString()}`;
    localStorage.setItem(key, JSON.stringify(tasks));
    
    // 如果任务完成，给予奖励
    if (task.progress === task.target) {
      return { completed: true, reward: task.reward };
    }
  }
  
  return { completed: false };
}

// 获取下次可以喂食/玩耍的时间
export function getNextActionTime(walletAddress, action) {
  const data = getPetData(walletAddress);
  if (!data) return null;
  
  const lastTime = action === 'feed' ? data.lastFed : data.lastPlayed;
  const cooldown = action === 'feed' ? 6 : 4; // hours
  const nextTime = lastTime + (cooldown * 60 * 60 * 1000);
  
  return nextTime;
}

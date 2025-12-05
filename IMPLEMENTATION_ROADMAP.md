# 🗺️ SolaMate 完整实现路线图

## 📊 系统架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Home   │  │   Pet    │  │ Friends  │  │ Expenses │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │   Chat   │  │  Navbar  │  │ Profile  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js API)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Chat   │  │  Profile │  │  Users   │  │Notifications│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Blockchain Layer (Solana)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Social     │  │     Chat     │  │   Expense    │     │
│  │   Program    │  │   Program    │  │   Program    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Database (Firebase Firestore)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Profiles │  │  Avatars │  │Notifications│               │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Phase 1: 智能合约部署 (你来做)

### ✅ 任务清单:

- [ ] 1. 打开 Solana Playground (https://beta.solpg.io/)
- [ ] 2. 部署 `social_program` (好友 + 宠物系统)
- [ ] 3. 部署 `chat_program` (链上聊天)
- [ ] 4. 部署 `expense_program` (消费追踪)
- [ ] 5. 记录 3 个 Program IDs
- [ ] 6. 告诉我 Program IDs，我会帮你集成到前端

### 📝 部署后提供给我:

```javascript
// 你需要提供这 3 个 ID
const PROGRAM_IDS = {
  SOCIAL_PROGRAM: 'YOUR_SOCIAL_PROGRAM_ID',
  CHAT_PROGRAM: 'YOUR_CHAT_PROGRAM_ID',
  EXPENSE_PROGRAM: 'YOUR_EXPENSE_PROGRAM_ID',
}
```

---

## 🎯 Phase 2: 前端集成 (我来做)

### 2.1 创建 Solana 集成层

**文件结构:**
```
frontend/lib/solana/
├── programIds.js          # Program IDs 配置
├── idl/
│   ├── social_program.json
│   ├── chat_program.json
│   └── expense_program.json
├── hooks/
│   ├── useSocialProgram.js    # 社交功能 hooks
│   ├── useChatProgram.js      # 聊天功能 hooks
│   └── useExpenseProgram.js   # 消费追踪 hooks
└── utils/
    ├── pdaHelpers.js          # PDA 地址计算
    └── anchorSetup.js         # Anchor 初始化
```

### 2.2 创建新页面

#### A. `/pet` - 宠物选择页面
**功能:**
- 显示 10 个宠物 GIF (1.gif - 10.gif)
- 用户点击选择
- 调用 `select_pet(pet_id)` 写入区块链
- 选择后显示在导航栏头像旁边

**UI 设计:**
```
┌─────────────────────────────────────┐
│  Choose Your Pet Companion! 🐾      │
├─────────────────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │    │
│  └───┘ └───┘ └───┘ └───┘ └───┘    │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│  │ 6 │ │ 7 │ │ 8 │ │ 9 │ │10 │    │
│  └───┘ └───┘ └───┘ └───┘ └───┘    │
│                                     │
│  [Confirm Selection]                │
└─────────────────────────────────────┘
```

#### B. `/friends` - 好友列表页面
**功能:**
- 显示所有好友列表
- 添加好友 (输入钱包地址)
- 接受/拒绝好友请求
- 点击好友进入聊天

**UI 设计:**
```
┌─────────────────────────────────────┐
│  Friends                             │
│  [+ Add Friend]                      │
├─────────────────────────────────────┤
│  Pending Requests (2)                │
│  ┌─────────────────────────────────┐│
│  │ 👤 Alice  [Accept] [Decline]    ││
│  │ 👤 Bob    [Accept] [Decline]    ││
│  └─────────────────────────────────┘│
│                                      │
│  My Friends (5)                      │
│  ┌─────────────────────────────────┐│
│  │ 👤 Carol  🐶  [Chat]            ││
│  │ 👤 Derek  🐱  [Chat]            ││
│  │ 👤 Eve    🐰  [Chat]            ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### C. `/chat/:friendAddress` - 好友聊天页面
**功能:**
- 显示与特定好友的聊天历史 (从区块链读取)
- 发送消息 (写入区块链)
- 实时更新 (轮询或 WebSocket)
- 支持转账 (集成现有 AI 助手)

**UI 设计:**
```
┌─────────────────────────────────────┐
│  ← Carol 🐶                          │
├─────────────────────────────────────┤
│  Carol: Hey! How are you?           │
│         2:30 PM                      │
│                                      │
│              You: Good! You?        │
│              2:31 PM                │
│                                      │
│  Carol: Great! Wanna grab dinner?   │
│         2:32 PM                      │
├─────────────────────────────────────┤
│  [Type a message...]  [Send]        │
└─────────────────────────────────────┘
```

#### D. `/expenses` - 消费历史页面
**功能:**
- 饼图显示分类占比
- 历史列表 (可筛选时间)
- AI 自动分类
- 导出数据

**UI 设计:**
```
┌─────────────────────────────────────┐
│  Expense Tracker                     │
│  [This Week ▼] [This Month] [Year]  │
├─────────────────────────────────────┤
│  ┌─────────────────┐                │
│  │   Pie Chart     │  Total: 5.2 SOL│
│  │   🍕 Dining 40% │  Dining: 2.1   │
│  │   🛍️ Shopping 30%│  Shopping: 1.6 │
│  │   🎮 Fun 20%    │  Fun: 1.0      │
│  │   ✈️ Travel 10% │  Travel: 0.5   │
│  └─────────────────┘                │
├─────────────────────────────────────┤
│  Recent Transactions                 │
│  ┌─────────────────────────────────┐│
│  │ 🍕 Dinner with Carol             ││
│  │    0.5 SOL → Carol               ││
│  │    Dec 5, 2:30 PM                ││
│  ├─────────────────────────────────┤│
│  │ 🛍️ Shopping                      ││
│  │    1.2 SOL → Store               ││
│  │    Dec 4, 10:00 AM               ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 2.3 修改现有页面

#### A. Navbar 修改
- 添加宠物图标显示 (在头像旁边)
- 添加 "Friends" 导航链接
- 添加 "Expenses" 导航链接

#### B. 首页修改
- 首次登录引导选择宠物
- 显示宠物和好友统计

---

## 🔄 完整用户流程

### 流程 1: 新用户注册
```
1. 用户连接钱包 (Phantom)
   ↓
2. 检查是否有 UserProfile (链上)
   ↓
3. 如果没有 → 调用 initialize_profile(username)
   ↓
4. 调用 initialize_expense_stats()
   ↓
5. 引导用户选择宠物 → /pet 页面
   ↓
6. 用户选择宠物 → 调用 select_pet(pet_id)
   ↓
7. 完成注册，显示首页
```

### 流程 2: 添加好友
```
1. 用户进入 /friends 页面
   ↓
2. 点击 "Add Friend"
   ↓
3. 输入好友钱包地址
   ↓
4. 调用 send_friend_request(friend_address)
   ↓
5. 创建 Friendship (status: Pending)
   ↓
6. 好友收到通知 (Firebase)
   ↓
7. 好友点击 "Accept"
   ↓
8. 调用 accept_friend_request()
   ↓
9. 更新 Friendship (status: Accepted)
   ↓
10. 双方好友列表更新
```

### 流程 3: 聊天
```
1. 用户在 /friends 点击好友头像
   ↓
2. 跳转到 /chat/:friendAddress
   ↓
3. 检查是否有 ChatRoom (链上)
   ↓
4. 如果没有 → 调用 initialize_chat_room()
   ↓
5. 加载聊天历史 (getProgramAccounts)
   ↓
6. 用户输入消息
   ↓
7. 调用 send_message(content)
   ↓
8. 消息写入区块链
   ↓
9. 对方轮询获取新消息 (每 5 秒)
```

### 流程 4: 转账 + 记录消费
```
1. 用户在聊天中说 "Send 0.5 SOL to Carol for dinner"
   ↓
2. AI 解析: amount=0.5, recipient=Carol, category=Dining
   ↓
3. 前端显示确认界面
   ↓
4. 用户确认
   ↓
5. 执行 SOL 转账 (SystemProgram.transfer)
   ↓
6. 转账成功 → 获取 tx_signature
   ↓
7. 调用 record_expense(amount, category, description, tx_signature)
   ↓
8. 创建 ExpenseRecord (链上)
   ↓
9. 更新 ExpenseStats (链上)
   ↓
10. 前端显示 "转账成功，已记录到消费历史"
```

### 流程 5: 查看消费历史
```
1. 用户进入 /expenses 页面
   ↓
2. 读取 ExpenseStats (链上)
   ↓
3. 计算各分类占比
   ↓
4. 渲染饼图 (Chart.js)
   ↓
5. 读取 ExpenseRecord[] (链上)
   ↓
6. 按时间排序
   ↓
7. 显示历史列表
   ↓
8. 用户可筛选时间范围
```

---

## 📦 需要安装的依赖

```bash
cd frontend

# Anchor 客户端
npm install @project-serum/anchor

# 图表库
npm install recharts

# 日期处理
npm install date-fns
```

---

## 🎨 宠物 GIF 准备

在 `frontend/public/pets/` 创建文件夹，放入:
- 1.gif (例如: 小狗)
- 2.gif (例如: 小猫)
- 3.gif (例如: 小兔)
- 4.gif (例如: 小熊)
- 5.gif (例如: 小鸟)
- 6.gif (例如: 小鱼)
- 7.gif (例如: 小龙)
- 8.gif (例如: 小猴)
- 9.gif (例如: 小猪)
- 10.gif (例如: 小狐狸)

---

## 🔐 数据存储策略

### 链上存储 (Solana - 永久):
✅ 用户档案 (username, pet_id)
✅ 好友关系
✅ 聊天消息
✅ 消费记录
✅ 消费统计

### 链下存储 (Firebase - 临时/缓存):
✅ 用户头像 (base64)
✅ 通知
✅ 用户搜索索引

---

## 📊 AI 分类逻辑

```javascript
// AI 根据描述关键词自动分类
const categorizeExpense = (description) => {
  const keywords = {
    dining: ['dinner', 'lunch', 'breakfast', 'food', 'restaurant', 'cafe'],
    shopping: ['buy', 'purchase', 'shop', 'store', 'mall'],
    entertainment: ['movie', 'game', 'concert', 'fun', 'party'],
    travel: ['flight', 'hotel', 'trip', 'vacation', 'uber', 'taxi'],
    gifts: ['gift', 'present', 'birthday'],
    bills: ['rent', 'utility', 'phone', 'internet', 'bill'],
  }
  
  // 匹配关键词
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => description.toLowerCase().includes(word))) {
      return category
    }
  }
  
  return 'other'
}
```

---

## 🚀 下一步行动

### 你的任务:
1. ✅ 去 Solana Playground 部署 3 个合约
2. ✅ 记录 Program IDs
3. ✅ 准备 10 个宠物 GIF
4. ✅ 告诉我 Program IDs

### 我的任务:
1. ⏭️ 创建 Solana 集成层
2. ⏭️ 创建 4 个新页面
3. ⏭️ 修改现有页面
4. ⏭️ 集成 AI 分类
5. ⏭️ 测试完整流程

---

## 💡 优化建议

1. **性能优化:**
   - 使用 SWR 缓存链上数据
   - 聊天消息分页加载
   - 消费历史虚拟滚动

2. **用户体验:**
   - 加载状态动画
   - 交易确认提示
   - 错误处理友好提示

3. **安全性:**
   - 验证好友关系后才能聊天
   - 消费记录签名验证
   - 防止重复提交

---

**准备好了吗？先去部署合约，然后告诉我 Program IDs，我会立刻开始写前端代码！🚀**

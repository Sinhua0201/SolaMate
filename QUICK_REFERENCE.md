# 🚀 SolaMate 快速参考文档

## 📋 项目概述

**SolaMate** - 基于 Solana 的社交支付平台，集成 AI 助手、链上聊天、消费追踪和宠物系统。

---

## 🎯 核心功能

### 1. 好友系统
- 添加钱包地址为好友
- 好友请求 (Pending → Accepted)
- 好友列表显示

### 2. 链上聊天
- 好友间 1v1 聊天
- 消息存储在区块链
- 实时消息同步

### 3. 消费追踪
- 转账自动记录
- AI 自动分类 (6 个分类)
- 饼图 + 历史列表
- 时间筛选

### 4. 宠物系统
- 10 个宠物可选 (1.gif - 10.gif)
- 选择后记录在链上
- 显示在头像旁边

---

## 📁 文件结构

```
solamate/
├── solana-contracts/              # 智能合约
│   ├── social_program/            # 社交系统
│   │   ├── lib.rs                 # 合约代码
│   │   └── Cargo.toml
│   ├── chat_program/              # 聊天系统
│   │   ├── lib.rs
│   │   └── Cargo.toml
│   ├── expense_program/           # 消费追踪
│   │   ├── lib.rs
│   │   └── Cargo.toml
│   ├── DEPLOYMENT_GUIDE.md        # 部署指南
│   └── Cargo.toml
│
├── frontend/                      # 前端应用
│   ├── pages/
│   │   ├── index.js               # 首页
│   │   ├── chat.js                # AI 助手聊天
│   │   ├── pet.js                 # 🆕 宠物选择
│   │   ├── friends.js             # 🆕 好友列表
│   │   ├── chat/[address].js      # 🆕 好友聊天
│   │   └── expenses.js            # 🆕 消费历史
│   │
│   ├── components/
│   │   ├── navbar.js              # 导航栏 (需修改)
│   │   ├── profile-provider.js
│   │   ├── notification-bell.js
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── solana/                # 🆕 Solana 集成
│   │   │   ├── programIds.js      # Program IDs
│   │   │   ├── hooks/             # React Hooks
│   │   │   ├── utils/             # 工具函数
│   │   │   └── idl/               # IDL 文件
│   │   ├── firebase.js
│   │   └── llmActions/
│   │
│   ├── public/
│   │   └── pets/                  # 🆕 宠物 GIF
│   │       ├── 1.gif
│   │       ├── 2.gif
│   │       └── ... (10 个)
│   │
│   └── pages/api/
│       ├── chat.js                # AI 聊天
│       ├── profile.js             # 用户档案
│       ├── users.js               # 用户列表
│       └── notifications.js       # 通知
│
├── SOLANA_CONTRACT_DESIGN.md      # 合约设计文档
├── IMPLEMENTATION_ROADMAP.md      # 实现路线图
└── QUICK_REFERENCE.md             # 本文档
```

---

## 🔗 智能合约 Account 结构

### Social Program

#### PetAccount
```rust
{
  owner: Pubkey,           // 钱包地址
  pet_id: u8,              // 宠物 ID (1-10)
  selected_at: i64,        // 选择时间
  bump: u8
}
```
**PDA:** `["pet_account", owner]`

**注意:** username 和照片存储在 Firestore，不在链上

#### Friendship
```rust
{
  user_a: Pubkey,          // 用户 A (字母序小)
  user_b: Pubkey,          // 用户 B (字母序大)
  status: Pending/Accepted,
  created_at: i64,
  bump: u8
}
```
**PDA:** `["friendship", user_a, user_b]`

### Chat Program

#### ChatRoom
```rust
{
  user_a: Pubkey,
  user_b: Pubkey,
  message_count: u64,
  last_message_at: i64,
  bump: u8
}
```
**PDA:** `["chat_room", user_a, user_b]`

#### Message
```rust
{
  chat_room: Pubkey,
  sender: Pubkey,
  content: String,         // max 500 chars
  message_index: u64,
  timestamp: i64,
  bump: u8
}
```
**PDA:** `["message", chat_room, message_index]`

### Expense Program

#### ExpenseRecord
```rust
{
  owner: Pubkey,
  recipient: Pubkey,
  amount: u64,             // lamports
  category: ExpenseCategory,
  description: String,     // max 100 chars
  tx_signature: String,
  record_index: u64,
  timestamp: i64,
  bump: u8
}
```
**PDA:** `["expense_record", owner, record_index]`

#### ExpenseStats
```rust
{
  owner: Pubkey,
  total_spent: u64,
  record_count: u64,
  dining_total: u64,
  shopping_total: u64,
  entertainment_total: u64,
  travel_total: u64,
  gifts_total: u64,
  bills_total: u64,
  other_total: u64,
  last_updated: i64,
  bump: u8
}
```
**PDA:** `["expense_stats", owner]`

---

## 🎨 消费分类

```javascript
enum ExpenseCategory {
  Dining,         // 🍕 餐饮
  Shopping,       // 🛍️ 购物
  Entertainment,  // 🎮 娱乐
  Travel,         // ✈️ 旅行
  Gifts,          // 🎁 礼物
  Bills,          // 📄 账单
  Other,          // 📦 其他
}
```

### AI 分类关键词
```javascript
{
  dining: ['dinner', 'lunch', 'breakfast', 'food', 'restaurant'],
  shopping: ['buy', 'purchase', 'shop', 'store'],
  entertainment: ['movie', 'game', 'concert', 'party'],
  travel: ['flight', 'hotel', 'trip', 'uber', 'taxi'],
  gifts: ['gift', 'present', 'birthday'],
  bills: ['rent', 'utility', 'phone', 'internet'],
}
```

---

## 🔄 关键流程

### 新用户注册
```
连接钱包 → Firestore 创建 profile → initialize_expense_stats() 
→ 选择宠物 → initialize_pet() → 完成
```

### 添加好友
```
输入地址 → send_friend_request() → 好友收到通知 
→ accept_friend_request() → 成为好友
```

### 聊天
```
点击好友 → initialize_chat_room() (首次) 
→ 加载历史 → send_message() → 实时同步
```

### 转账 + 记录
```
AI 解析 → 确认 → SystemProgram.transfer() 
→ record_expense() → 更新统计
```

---

## 🛠️ 部署步骤

### 1. 部署智能合约 (Solana Playground)
```
1. 访问 https://beta.solpg.io/
2. 创建新项目 (Anchor)
3. 复制 social_program/lib.rs
4. 构建: build
5. 部署: deploy
6. 记录 Program ID
7. 重复步骤 3-6 部署其他 2 个合约
```

### 2. 配置前端
```javascript
// frontend/lib/solana/programIds.js
export const PROGRAM_IDS = {
  SOCIAL_PROGRAM: 'YOUR_ID_HERE',
  CHAT_PROGRAM: 'YOUR_ID_HERE',
  EXPENSE_PROGRAM: 'YOUR_ID_HERE',
}
```

### 3. 准备宠物 GIF
```
frontend/public/pets/
├── 1.gif
├── 2.gif
├── ...
└── 10.gif
```

---

## 📊 数据存储策略

### 链上 (Solana) - 永久存储
✅ 宠物选择 (PetAccount)
✅ 好友关系 (Friendship)
✅ 聊天消息 (Message)
✅ 消费记录 (ExpenseRecord)
✅ 消费统计 (ExpenseStats)

### 链下 (Firebase) - 用户数据
✅ 用户档案 (username, avatar, walletAddress)
✅ 通知
✅ 搜索索引

---

## 🔧 前端技术栈

```json
{
  "blockchain": [
    "@solana/web3.js",
    "@solana/wallet-adapter-react",
    "@project-serum/anchor"
  ],
  "ui": [
    "next.js",
    "react",
    "tailwindcss",
    "framer-motion",
    "recharts"
  ],
  "backend": [
    "firebase/firestore",
    "deepseek-ai"
  ]
}
```

---

## 📝 待办事项

### 你的任务:
- [ ] 部署 social_program
- [ ] 部署 chat_program
- [ ] 部署 expense_program
- [ ] 记录 3 个 Program IDs
- [ ] 准备 10 个宠物 GIF
- [ ] 告诉我 Program IDs

### 我的任务:
- [ ] 创建 Solana 集成层
- [ ] 创建 /pet 页面
- [ ] 创建 /friends 页面
- [ ] 创建 /chat/:address 页面
- [ ] 创建 /expenses 页面
- [ ] 修改 navbar
- [ ] 集成 AI 分类
- [ ] 测试完整流程

---

## 🆘 常见问题

### Q: 如何获取测试 SOL?
```bash
solana airdrop 2
```

### Q: 如何查看链上数据?
```bash
solana account <ACCOUNT_ADDRESS>
```

### Q: 如何计算 PDA 地址?
```javascript
const [pda, bump] = await PublicKey.findProgramAddress(
  [Buffer.from("user_profile"), userWallet.toBuffer()],
  programId
);
```

### Q: 消息存储成本?
- 每条消息约 0.004 SOL (Devnet 免费)
- 建议只存储最近 100 条

### Q: 如何优化查询性能?
- 使用 SWR 缓存
- 分页加载
- 索引常用数据

---

## 📚 参考资源

- **Solana 文档:** https://docs.solana.com/
- **Anchor 文档:** https://www.anchor-lang.com/
- **Solana Playground:** https://beta.solpg.io/
- **Solana Explorer:** https://explorer.solana.com/?cluster=devnet

---

## 🎯 下一步

1. **现在:** 去 Solana Playground 部署合约
2. **然后:** 告诉我 Program IDs
3. **接着:** 我会写前端集成代码
4. **最后:** 测试完整功能

---

**准备好了吗？Let's build something amazing! 🚀**

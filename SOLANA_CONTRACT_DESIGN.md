# Solana 智能合约设计文档

## 🎯 系统概述

SolaMate 的 Solana 智能合约系统，包含社交、聊天、消费追踪三大模块。

---

## 📦 合约 1: Social Program (社交系统)

### **Account 结构：**

#### 1. PetAccount (宠物账户)
```rust
pub struct PetAccount {
    pub owner: Pubkey,              // 钱包地址
    pub pet_id: u8,                 // 宠物 ID (1-10)
    pub selected_at: i64,           // 选择时间戳
    pub bump: u8,                   // PDA bump
}
```

**PDA Seeds:** `["pet_account", owner.key()]`

**说明:** 只记录宠物选择，username 和照片存储在 Firestore

#### 2. Friendship (好友关系)
```rust
pub struct Friendship {
    pub user_a: Pubkey,             // 用户 A
    pub user_b: Pubkey,             // 用户 B (按字母序排列)
    pub status: FriendshipStatus,   // 状态: Pending/Accepted
    pub created_at: i64,            // 创建时间
    pub bump: u8,
}

pub enum FriendshipStatus {
    Pending,    // 待接受
    Accepted,   // 已接受
}
```

**PDA Seeds:** `["friendship", min(user_a, user_b).key(), max(user_a, user_b).key()]`

### **Instructions (指令):**

```rust
// 1. 初始化宠物账户 (首次选择宠物)
pub fn initialize_pet(ctx: Context<InitializePet>, pet_id: u8) -> Result<()>

// 2. 更换宠物
pub fn change_pet(ctx: Context<ChangePet>, pet_id: u8) -> Result<()>

// 3. 发送好友请求
pub fn send_friend_request(ctx: Context<SendFriendRequest>) -> Result<()>

// 4. 接受好友请求
pub fn accept_friend_request(ctx: Context<AcceptFriendRequest>) -> Result<()>

// 5. 移除好友
pub fn remove_friend(ctx: Context<RemoveFriend>) -> Result<()>

// 6. 获取好友列表 (通过 RPC 查询所有 Friendship accounts)
```

---

## 💬 合约 2: Chat Program (聊天系统)

### **Account 结构：**

#### 1. ChatRoom (聊天室)
```rust
pub struct ChatRoom {
    pub user_a: Pubkey,             // 用户 A
    pub user_b: Pubkey,             // 用户 B (按字母序)
    pub message_count: u64,         // 消息总数
    pub last_message_at: i64,       // 最后消息时间
    pub bump: u8,
}
```

**PDA Seeds:** `["chat_room", min(user_a, user_b).key(), max(user_a, user_b).key()]`

#### 2. Message (消息)
```rust
pub struct Message {
    pub chat_room: Pubkey,          // 所属聊天室
    pub sender: Pubkey,             // 发送者
    pub content: String,            // 消息内容 (max 500 chars)
    pub message_index: u64,         // 消息序号
    pub timestamp: i64,             // 时间戳
    pub bump: u8,
}
```

**PDA Seeds:** `["message", chat_room.key(), message_index.to_le_bytes()]`

### **Instructions:**

```rust
// 1. 初始化聊天室 (首次聊天时自动创建)
pub fn initialize_chat_room(ctx: Context<InitializeChatRoom>) -> Result<()>

// 2. 发送消息
pub fn send_message(ctx: Context<SendMessage>, content: String) -> Result<()>

// 3. 获取聊天历史 (通过 RPC 查询所有 Message accounts)
```

---

## 💰 合约 3: Expense Program (消费追踪)

### **Account 结构：**

#### 1. ExpenseRecord (消费记录)
```rust
pub struct ExpenseRecord {
    pub owner: Pubkey,              // 消费者
    pub recipient: Pubkey,          // 收款人
    pub amount: u64,                // 金额 (lamports)
    pub category: ExpenseCategory,  // 分类
    pub description: String,        // 描述 (max 100 chars)
    pub timestamp: i64,             // 时间戳
    pub tx_signature: String,       // 交易签名 (用于验证)
    pub record_index: u64,          // 记录序号
    pub bump: u8,
}

pub enum ExpenseCategory {
    Dining,         // 餐饮
    Shopping,       // 购物
    Entertainment,  // 娱乐
    Travel,         // 旅行
    Gifts,          // 礼物
    Bills,          // 账单
    Other,          // 其他
}
```

**PDA Seeds:** `["expense_record", owner.key(), record_index.to_le_bytes()]`

#### 2. ExpenseStats (消费统计)
```rust
pub struct ExpenseStats {
    pub owner: Pubkey,              // 用户
    pub total_spent: u64,           // 总消费 (lamports)
    pub record_count: u64,          // 记录总数
    
    // 各分类消费统计
    pub dining_total: u64,
    pub shopping_total: u64,
    pub entertainment_total: u64,
    pub travel_total: u64,
    pub gifts_total: u64,
    pub bills_total: u64,
    pub other_total: u64,
    
    pub last_updated: i64,          // 最后更新时间
    pub bump: u8,
}
```

**PDA Seeds:** `["expense_stats", owner.key()]`

### **Instructions:**

```rust
// 1. 初始化消费统计账户
pub fn initialize_expense_stats(ctx: Context<InitializeExpenseStats>) -> Result<()>

// 2. 记录消费 (转账后调用)
pub fn record_expense(
    ctx: Context<RecordExpense>,
    amount: u64,
    category: ExpenseCategory,
    description: String,
    tx_signature: String,
) -> Result<()>

// 3. 获取消费历史 (通过 RPC 查询)
// 4. 获取统计数据 (读取 ExpenseStats account)
```

---

## 🔄 完整用户流程

### **1. 用户注册流程**
```
1. 连接钱包 (Phantom/Solflare)
2. 在 Firestore 创建 profile (username, avatar, walletAddress)
3. 调用 initialize_expense_stats() → 创建 ExpenseStats (链上)
4. 前端显示 "选择宠物" 引导
```

### **2. 选择宠物流程**
```
1. 用户进入 /pet 页面
2. 显示 1.gif - 10.gif 的宠物选项
3. 用户点击选择
4. 调用 initialize_pet(pet_id) → 创建 PetAccount (链上)
5. 宠物显示在用户头像旁边
6. 可以调用 change_pet(pet_id) 更换宠物
```

### **3. 添加好友流程**
```
1. 用户输入好友的钱包地址
2. 调用 send_friend_request(friend_address)
   → 创建 Friendship (status: Pending)
3. 好友收到通知 (通过 Firebase)
4. 好友调用 accept_friend_request()
   → 更新 Friendship (status: Accepted)
5. 双方好友列表更新
```

### **4. 聊天流程**
```
1. 用户点击好友头像进入聊天
2. 首次聊天自动调用 initialize_chat_room()
3. 用户输入消息
4. 调用 send_message(content)
   → 创建 Message account
   → 更新 ChatRoom.message_count
5. 对方通过 WebSocket/轮询获取新消息
```

### **5. 转账 + 记录消费流程**
```
1. 用户在聊天中说 "Send 0.5 SOL to @alice for dinner"
2. AI 解析: amount=0.5, recipient=alice, category=dining
3. 执行 SOL 转账 (SystemProgram.transfer)
4. 转账成功后，调用 record_expense()
   → 创建 ExpenseRecord
   → 更新 ExpenseStats (增加 dining_total)
5. 前端显示 "转账成功，已记录到消费历史"
```

### **6. 查看消费历史流程**
```
1. 用户进入 /expenses 页面
2. 前端调用 RPC: getProgramAccounts(ExpenseProgram)
   → 筛选 owner = user_wallet
   → 按 timestamp 排序
3. 显示饼图:
   - 读取 ExpenseStats account
   - 计算各分类占比
   - 使用 Chart.js/Recharts 渲染
4. 显示历史列表:
   - 支持时间筛选 (this week/month/year/custom)
   - 显示: 时间、收款人、金额、分类、描述
```

---

## 🎨 前端页面结构

### **新增页面:**

```
/pet              - 宠物选择页面
/friends          - 好友列表页面
/chat/:address    - 聊天页面 (与特定好友)
/expenses         - 消费历史 + 统计页面
```

### **修改页面:**

```
/chat (现有)      - 改为 AI 助手聊天 (不变)
/                 - 首页添加 "选择宠物" 引导
navbar            - 添加宠物图标显示
```

---

## 📊 数据存储策略

### **链上存储 (Solana):**
- ✅ 宠物选择 (PetAccount)
- ✅ 好友关系 (Friendship)
- ✅ 聊天消息 (Message)
- ✅ 消费记录 (ExpenseRecord)
- ✅ 消费统计 (ExpenseStats)

### **链下存储 (Firebase):**
- ✅ 用户档案 (username, avatar, walletAddress)
- ✅ 通知 (notifications)
- ✅ 用户搜索索引
- ✅ 临时缓存 (减少 RPC 调用)

---

## 🔐 安全考虑

1. **权限验证:**
   - 所有写操作需验证 `signer == owner`
   - 好友请求需双方确认

2. **数据验证:**
   - 字符串长度限制 (防止账户过大)
   - 金额范围检查
   - 分类枚举验证

3. **防重放攻击:**
   - 使用 `record_index` 和 `message_index` 确保唯一性
   - 存储 `tx_signature` 防止重复记录

---

## 💡 优化建议

1. **减少链上存储成本:**
   - 聊天消息可考虑只存储最近 100 条
   - 旧消息归档到 Arweave/IPFS

2. **提升查询性能:**
   - 使用 Solana RPC 的 `getProgramAccounts` 配合 filters
   - 前端缓存常用数据 (好友列表、统计数据)

3. **用户体验:**
   - 转账时自动弹出分类选择
   - AI 自动识别分类 (通过描述关键词)
   - 实时更新饼图和历史列表

---

## 🚀 部署步骤

1. **编写 Rust 合约** (使用 Anchor 框架)
2. **在 Solana Playground 测试**
3. **部署到 Devnet**
4. **获取 Program ID**
5. **前端集成** (使用 @project-serum/anchor)
6. **测试完整流程**
7. **部署到 Mainnet** (可选)

---

## 📝 下一步行动

1. 我先帮你生成 3 个 Solana 合约代码
2. 你去 Solana Playground 部署
3. 我再帮你写前端集成代码
4. 创建新页面 (/pet, /friends, /expenses)
5. 修改现有聊天页面支持好友聊天

准备好了吗？我现在开始写合约代码！🚀

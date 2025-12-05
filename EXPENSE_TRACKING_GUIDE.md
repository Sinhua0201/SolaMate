# 💰 Expense Tracking System Guide

## 概述

Expense Tracking 系统允许用户在区块链上记录和追踪他们的消费，提供可视化的消费分析和历史记录。

## 功能特性

### 1. 消费分类
- 🍽️ Dining (餐饮)
- 🛍️ Shopping (购物)
- 🎮 Entertainment (娱乐)
- ✈️ Travel (旅行)
- 🎁 Gifts (礼物)
- 📄 Bills (账单)
- 📦 Other (其他)

### 2. 数据可视化
- **饼图展示**: 按分类显示消费占比
- **颜色编码**: 每个分类有独特的颜色
- **实时统计**: 总消费金额和记录数量

### 3. 过滤功能
- **时间过滤**:
  - This Week (本周)
  - This Month (本月)
  - This Year (本年)
  - All Time (全部)
  - Custom (自定义日期范围)

- **分类过滤**: 按消费类别筛选记录

### 4. 交易历史
- 显示所有消费记录
- 包含金额、分类、描述、时间
- 链接到 Solana Explorer 查看交易详情

## 使用流程

### 步骤 1: 初始化账户

首次使用需要初始化 Expense Stats 账户：

```javascript
import { useInitializeExpenseStats } from '@/lib/solana/hooks/useExpenseProgram';

const { initializeExpenseStats, isLoading } = useInitializeExpenseStats();

// 调用初始化
const result = await initializeExpenseStats();
```

### 步骤 2: 记录消费

在聊天中发送支付或转账时，系统会自动记录消费：

```javascript
import { useRecordExpense, ExpenseCategory } from '@/lib/solana/hooks/useExpenseProgram';

const { recordExpense } = useRecordExpense();

// 记录消费
await recordExpense({
  recipientAddress: 'recipient_wallet_address',
  amount: 10000000, // lamports (0.01 SOL)
  category: ExpenseCategory.Dining,
  description: 'Lunch with friends',
  txSignature: 'transaction_signature',
});
```

### 步骤 3: 查看统计

访问 `/expenses` 页面查看：
- 消费分类饼图
- 总消费金额
- 交易历史记录
- 按时间和分类过滤

## 技术实现

### 智能合约结构

#### ExpenseStats Account
```rust
pub struct ExpenseStats {
    pub owner: Pubkey,
    pub total_spent: u64,
    pub record_count: u64,
    pub dining_total: u64,
    pub shopping_total: u64,
    pub entertainment_total: u64,
    pub travel_total: u64,
    pub gifts_total: u64,
    pub bills_total: u64,
    pub other_total: u64,
}
```

#### ExpenseRecord Account
```rust
pub struct ExpenseRecord {
    pub owner: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub category: ExpenseCategory,
    pub description: String,
    pub timestamp: i64,
    pub tx_signature: String,
}
```

### PDA 生成

```javascript
// Expense Stats PDA
const [expenseStatsPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('expense_stats'),
    userPublicKey.toBuffer(),
  ],
  programId
);

// Expense Record PDA
const [expenseRecordPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('expense_record'),
    userPublicKey.toBuffer(),
    new BN(recordIndex).toArrayLike(Buffer, 'le', 8),
  ],
  programId
);
```

## 集成到聊天系统

在 `chat-window.js` 中，支付成功后自动记录消费：

```javascript
// 发送支付后
const signature = await sendPayment(amount);

// 记录消费
await recordExpense({
  recipientAddress: friend.address,
  amount: amountLamports,
  category: ExpenseCategory.Other,
  description: `Payment to ${friend.name}`,
  txSignature: signature,
});
```

## AI 自动分类

系统提供智能分类功能，根据描述自动判断消费类别：

```javascript
import { categorizeExpense } from '@/lib/solana/hooks/useExpenseProgram';

const category = categorizeExpense('Dinner at restaurant');
// 返回: ExpenseCategory.Dining
```

关键词匹配规则：
- **Dining**: dinner, lunch, breakfast, food, restaurant, cafe
- **Shopping**: buy, purchase, shop, store, mall, clothes
- **Entertainment**: movie, game, concert, fun, party
- **Travel**: flight, hotel, trip, vacation, uber, taxi
- **Gifts**: gift, present, birthday, anniversary
- **Bills**: rent, utility, phone, internet, bill, subscription

## 测试

### 使用测试页面

访问 `/test-expense` 进行功能测试：

1. 连接钱包
2. 初始化 Expense Stats
3. 填写测试数据：
   - 收款地址
   - 金额
   - 分类
   - 描述
4. 提交记录
5. 查看结果

### 命令行测试

```bash
# 进入前端目录
cd frontend

# 启动开发服务器
npm run dev

# 访问测试页面
# http://localhost:3000/test-expense
```

## 数据查询

### 获取统计数据

```javascript
import { getExpenseStats } from '@/lib/solana/hooks/useExpenseProgram';

const stats = await getExpenseStats(program, userPublicKey);
console.log('Total spent:', stats.totalSpent);
console.log('Record count:', stats.recordCount);
```

### 获取消费历史

```javascript
import { getExpenseHistory } from '@/lib/solana/hooks/useExpenseProgram';

const records = await getExpenseHistory(program, userPublicKey, 50);
records.forEach(record => {
  console.log(`${record.description}: ${record.amount} lamports`);
});
```

## 注意事项

1. **初始化**: 每个用户只需初始化一次 Expense Stats 账户
2. **费用**: 每次记录消费需要支付少量 SOL 作为账户租金
3. **存储**: 所有数据存储在 Solana 区块链上，永久保存
4. **隐私**: 消费记录是公开的，任何人都可以查看
5. **限制**: 描述字段最多 200 个字符

## 未来改进

- [ ] 添加预算设置和警告
- [ ] 支持多币种记录
- [ ] 导出消费报告（CSV/PDF）
- [ ] 消费趋势分析
- [ ] 与朋友分享消费统计
- [ ] 定期消费提醒
- [ ] 消费目标设定

## 相关文件

- `frontend/pages/expenses.js` - 主页面
- `frontend/pages/test-expense.js` - 测试页面
- `frontend/lib/solana/hooks/useExpenseProgram.js` - React Hooks
- `solana-contracts/solamate_program.rs` - 智能合约
- `frontend/lib/solana/pdaHelpers.js` - PDA 辅助函数

## 支持

如有问题，请查看：
- Solana Explorer: https://explorer.solana.com/?cluster=devnet
- 项目文档: README.md
- 快速参考: QUICK_REFERENCE.md

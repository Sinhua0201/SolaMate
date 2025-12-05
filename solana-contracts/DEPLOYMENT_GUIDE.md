# Solana 智能合约部署指南

## 📋 前置准备

### 1. 安装 Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### 2. 安装 Anchor CLI
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 3. 配置 Solana 网络
```bash
# 使用 Devnet
solana config set --url https://api.devnet.solana.com

# 创建钱包 (如果没有)
solana-keygen new --outfile ~/.config/solana/id.json

# 查看钱包地址
solana address

# 获取测试 SOL (Devnet)
solana airdrop 2
```

---

## 🚀 方法 1: 使用 Solana Playground (推荐)

### 步骤：

1. **打开 Solana Playground**
   - 访问: https://beta.solpg.io/

2. **创建新项目**
   - 点击 "Create a new project"
   - 选择 "Anchor" 模板

3. **上传合约代码**
   - 将 `social_program/lib.rs` 内容复制到 `src/lib.rs`
   - 更新 `Cargo.toml` 依赖

4. **构建合约**
   ```bash
   build
   ```

5. **部署合约**
   ```bash
   deploy
   ```

6. **记录 Program ID**
   - 部署成功后会显示 Program ID
   - 例如: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`

7. **更新代码中的 Program ID**
   - 将 `declare_id!("11111...")` 替换为真实的 Program ID
   - 重新构建和部署

8. **重复步骤 3-7** 部署其他两个合约:
   - `chat_program`
   - `expense_program`

---

## 🛠️ 方法 2: 本地部署 (高级)

### 1. 初始化 Anchor 项目

```bash
# 创建项目目录
mkdir solamate-contracts
cd solamate-contracts

# 初始化 Anchor 项目
anchor init social_program
anchor init chat_program
anchor init expense_program
```

### 2. 替换代码

将对应的 `lib.rs` 文件复制到各个项目的 `programs/*/src/lib.rs`

### 3. 构建合约

```bash
cd social_program
anchor build

cd ../chat_program
anchor build

cd ../expense_program
anchor build
```

### 4. 部署到 Devnet

```bash
# 部署 social_program
cd social_program
anchor deploy --provider.cluster devnet

# 记录 Program ID，更新 lib.rs 中的 declare_id!
# 重新构建
anchor build
anchor deploy --provider.cluster devnet

# 重复以上步骤部署其他合约
```

### 5. 获取 Program ID

```bash
# 查看已部署的程序
solana program show <PROGRAM_ID>
```

---

## 📝 部署后的配置

### 1. 记录 Program IDs

部署完成后，你会得到 3 个 Program ID:

```
Social Program:  7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Chat Program:    8yLXtg3DX98e08UYTDqcE6kBmhfVrB94VZSvKpthBcVW
Expense Program: 9zMYuh4EY09f19VZUErcF7lCnhgWsC95WZTwLqujDdXY
```

### 2. 更新前端配置

创建 `frontend/lib/solana/programIds.js`:

```javascript
export const PROGRAM_IDS = {
  SOCIAL_PROGRAM: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  CHAT_PROGRAM: '8yLXtg3DX98e08UYTDqcE6kBmhfVrB94VZSvKpujDdXY',
  EXPENSE_PROGRAM: '9zMYuh4EY09f19VZUErcF7lCnhgWsC95WZTwLqujDdXY',
}
```

### 3. 生成 IDL 文件

IDL (Interface Definition Language) 文件用于前端调用合约:

```bash
# Anchor 会自动生成 IDL 文件在 target/idl/ 目录
# 复制到前端项目
cp target/idl/social_program.json frontend/lib/solana/idl/
cp target/idl/chat_program.json frontend/lib/solana/idl/
cp target/idl/expense_program.json frontend/lib/solana/idl/
```

---

## 🧪 测试合约

### 使用 Anchor 测试框架

```bash
# 运行测试
anchor test
```

### 手动测试 (使用 Solana CLI)

```bash
# 调用 initialize_profile
solana program invoke <PROGRAM_ID> \
  --keypair ~/.config/solana/id.json \
  --data <INSTRUCTION_DATA>
```

---

## 📊 监控和调试

### 1. 查看程序日志

```bash
solana logs <PROGRAM_ID>
```

### 2. 查看账户数据

```bash
solana account <ACCOUNT_ADDRESS>
```

### 3. 使用 Solana Explorer

- Devnet: https://explorer.solana.com/?cluster=devnet
- 搜索你的 Program ID 查看交易历史

---

## 💰 成本估算

### Devnet (免费测试)
- 部署成本: 0 SOL (使用 airdrop)
- 账户租金: 免费

### Mainnet (生产环境)
- 部署成本: ~2-5 SOL per program
- 账户租金: 
  - UserProfile: ~0.002 SOL
  - Friendship: ~0.002 SOL
  - ChatRoom: ~0.002 SOL
  - Message: ~0.004 SOL
  - ExpenseRecord: ~0.003 SOL
  - ExpenseStats: ~0.002 SOL

---

## 🔧 常见问题

### 1. "Insufficient funds" 错误
```bash
# 获取更多测试 SOL
solana airdrop 2
```

### 2. "Program ID mismatch" 错误
- 确保 `declare_id!()` 中的 ID 与部署后的 Program ID 一致
- 重新构建和部署

### 3. "Account already exists" 错误
- PDA 账户已存在，使用不同的 seeds 或关闭旧账户

### 4. 构建失败
```bash
# 清理缓存
cargo clean
anchor clean

# 重新构建
anchor build
```

---

## 📚 下一步

1. ✅ 部署 3 个智能合约到 Devnet
2. ✅ 记录 Program IDs
3. ✅ 生成 IDL 文件
4. ⏭️ 前端集成 (我会帮你写)
5. ⏭️ 创建新页面 (/pet, /friends, /expenses)
6. ⏭️ 测试完整流程

---

## 🆘 需要帮助？

- Anchor 文档: https://www.anchor-lang.com/
- Solana 文档: https://docs.solana.com/
- Solana Playground: https://beta.solpg.io/
- Discord: Solana Tech Discord

---

**准备好了吗？去 Solana Playground 部署你的第一个合约吧！🚀**

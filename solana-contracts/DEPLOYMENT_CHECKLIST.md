# ✅ 部署检查清单

## 📦 文件准备

- [x] `solamate_program.rs` - 完整合约代码 (单文件)
- [x] 包含所有 3 个系统:
  - [x] 社交系统 (好友 + 宠物)
  - [x] 聊天系统 (链上消息)
  - [x] 消费追踪 (记录 + 统计)

---

## 🚀 部署步骤

### Step 1: 打开 Solana Playground
- [ ] 访问 https://beta.solpg.io/
- [ ] 连接钱包 (或使用 Playground 钱包)

### Step 2: 创建项目
- [ ] 点击 "+" 创建新项目
- [ ] 选择 "Anchor" 模板

### Step 3: 复制代码
- [ ] 打开 `src/lib.rs`
- [ ] 删除所有内容
- [ ] 复制 `solamate_program.rs` 全部内容
- [ ] 粘贴到 `src/lib.rs`

### Step 4: 构建
- [ ] 运行命令: `build`
- [ ] 等待构建完成 (1-2 分钟)
- [ ] 确认没有错误

### Step 5: 部署
- [ ] 运行命令: `deploy`
- [ ] 记录 Program ID: `_______________________________`

### Step 6: 更新 Program ID
- [ ] 在代码第 3 行找到 `declare_id!("11111...")`
- [ ] 替换为你的 Program ID
- [ ] 保存文件

### Step 7: 重新构建和部署
- [ ] 运行命令: `build`
- [ ] 运行命令: `deploy`
- [ ] 确认部署成功

---

## 📝 记录信息

### 部署信息
```
Program ID: _______________________________________

部署时间: _______________________________________

网络: Devnet

部署者钱包: _______________________________________
```

---

## 🧪 验证部署

### 检查合约是否存在
```bash
solana program show YOUR_PROGRAM_ID
```

### 查看合约日志
```bash
solana logs YOUR_PROGRAM_ID
```

---

## 📤 提供给前端开发者

把以下信息发给我:

```javascript
// 你的 Program ID
const SOLAMATE_PROGRAM_ID = "YOUR_PROGRAM_ID_HERE";
```

---

## 🎯 完成后

- [ ] Program ID 已记录
- [ ] 合约部署成功
- [ ] 已告知前端开发者
- [ ] 准备好集成前端

---

## 🆘 遇到问题？

### 构建失败
1. 检查代码是否完整
2. 确保 Cargo.toml 正确
3. 运行 `anchor clean`
4. 重新 `build`

### 部署失败
1. 检查钱包余额: `solana balance`
2. 获取测试 SOL: `solana airdrop 2`
3. 重试部署: `deploy`

### 其他问题
- 查看 Solana Playground 控制台错误
- 检查网络连接
- 重启浏览器

---

**完成所有步骤后，告诉我你的 Program ID！🚀**

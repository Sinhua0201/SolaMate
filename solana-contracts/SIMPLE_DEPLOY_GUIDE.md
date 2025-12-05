# 🚀 SolaMate 合约部署指南 (单文件版本)

## ✅ 你只需要部署 1 个文件！

所有功能已合并到 `solamate_program.rs`，包含：
- ✅ 社交系统 (好友 + 宠物)
- ✅ 聊天系统 (链上消息)
- ✅ 消费追踪 (记录 + 统计)

---

## 📝 部署步骤 (Solana Playground)

### 1. 打开 Solana Playground
访问: **https://beta.solpg.io/**

### 2. 创建新项目
- 点击左上角 "+" 按钮
- 选择 "Anchor" 模板

### 3. 替换代码
- 打开 `src/lib.rs`
- 删除所有内容
- 复制 `solamate_program.rs` 的全部内容
- 粘贴到 `src/lib.rs`

### 4. 更新 Cargo.toml
确保 `programs/solamate_program/Cargo.toml` 包含:

```toml
[package]
name = "solamate_program"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "solamate_program"

[dependencies]
anchor-lang = "0.29.0"
```

### 5. 构建合约
在终端输入:
```bash
build
```

等待构建完成 (可能需要 1-2 分钟)

### 6. 部署合约
在终端输入:
```bash
deploy
```

### 7. 记录 Program ID
部署成功后会显示:
```
Program Id: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**重要:** 复制这个 Program ID！

### 8. 更新代码中的 Program ID
- 在 `lib.rs` 第 3 行找到:
  ```rust
  declare_id!("11111111111111111111111111111111");
  ```
- 替换为你的 Program ID:
  ```rust
  declare_id!("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
  ```

### 9. 重新构建和部署
```bash
build
deploy
```

### 10. 完成！🎉
你的合约已成功部署到 Solana Devnet！

---

## 📋 部署后提供给我

把你的 Program ID 告诉我:

```
Program ID: YOUR_PROGRAM_ID_HERE
```

我会帮你集成到前端！

---

## 🧪 测试合约 (可选)

### 查看合约信息
```bash
solana program show YOUR_PROGRAM_ID
```

### 查看合约日志
```bash
solana logs YOUR_PROGRAM_ID
```

---

## 🆘 常见问题

### Q: "Insufficient funds" 错误
**解决方法:**
```bash
solana airdrop 2
```

### Q: 构建失败
**解决方法:**
1. 检查代码是否完整复制
2. 确保 Cargo.toml 配置正确
3. 清理缓存: `anchor clean`
4. 重新构建: `build`

### Q: 部署失败
**解决方法:**
1. 确保钱包有足够的 SOL
2. 检查网络连接
3. 重试部署: `deploy`

---

## 📊 合约包含的功能

### 社交系统 (5 个指令)
1. `initialize_profile` - 创建用户档案
2. `select_pet` - 选择宠物
3. `send_friend_request` - 发送好友请求
4. `accept_friend_request` - 接受好友请求
5. `remove_friend` - 移除好友

### 聊天系统 (3 个指令)
1. `initialize_chat_room` - 创建聊天室
2. `send_message` - 发送消息
3. `delete_message` - 删除消息

### 消费追踪 (3 个指令)
1. `initialize_expense_stats` - 初始化统计
2. `record_expense` - 记录消费
3. `delete_expense_record` - 删除记录

**总共 11 个指令，全部在一个合约里！**

---

## 🎯 下一步

1. ✅ 部署合约
2. ✅ 记录 Program ID
3. ✅ 告诉我 Program ID
4. ⏭️ 我会写前端集成代码
5. ⏭️ 创建新页面
6. ⏭️ 测试完整功能

---

**准备好了吗？去 Solana Playground 部署吧！只需要 5 分钟！🚀**

# ⚡ 5 分钟快速部署

## 🎯 只需 5 步！

### 1️⃣ 打开网站
访问: **https://beta.solpg.io/**

### 2️⃣ 创建项目
- 点击 **"+"** 按钮
- 选择 **"Anchor"**
- 项目名: `solamate`

### 3️⃣ 替换代码
- 打开 `programs/solamate/src/lib.rs`
- 删除所有内容
- 复制 `solamate_program.rs` 的全部内容
- 粘贴进去
- 保存 (Ctrl+S)

### 4️⃣ 获取测试 SOL
- 点击左下角 **"Not connected"**
- 选择 **"Playground Wallet"**
- 点击 **"Airdrop"** → 选择 **"2 SOL"**

### 5️⃣ 构建和部署
在终端输入:
```bash
build
```
等待完成后，输入:
```bash
deploy
```

---

## ✅ 完成！

复制显示的 **Program ID**，告诉我！

格式:
```
Program ID: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

---

## 🔄 重要: 更新 Program ID

部署后，回到代码第 3 行:
```rust
declare_id!("11111111111111111111111111111111");
```

替换为你的 Program ID:
```rust
declare_id!("你的Program ID");
```

保存后，再次运行:
```bash
build
deploy
```

---

**就这么简单！🎉**

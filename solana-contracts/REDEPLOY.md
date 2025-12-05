# 重新部署合约

## 修改内容
- `AcceptFriendRequest` 现在使用 `init_if_needed`，会自动初始化缺失的 profiles
- 接受好友请求时不再需要双方都已经有 profile

## 部署步骤

```bash
# 1. 构建合约
anchor build

# 2. 部署到 devnet
anchor deploy

# 3. 复制新的 Program ID 到 frontend/lib/solana/programIds.js

# 4. 复制新的 IDL
cp target/idl/solamate_program.json ../frontend/lib/solana/idl/

# 5. 重启前端
cd ../frontend
npm run dev
```

## 注意
- 会生成新的 Program ID
- 旧数据不会迁移
- 需要约 2-3 SOL 部署费用

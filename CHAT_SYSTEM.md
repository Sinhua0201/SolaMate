# SolaMate Chat System

## 功能特点

### 1. AI 聊天
- 第一个聊天永远是 AI Assistant
- 消息存储在本地 localStorage
- 即时回复（模拟）

### 2. 好友聊天
- 只能与已接受的好友聊天
- 所有消息记录在 Solana 区块链上
- 自动初始化聊天室
- 实时消息加载

### 3. UI 设计
- WhatsApp/Discord 风格
- 左侧：聊天列表（AI + 好友）
- 右侧：聊天窗口
- 响应式设计

## 使用流程

1. **连接钱包**
   - 点击 "Connect Wallet"
   - 选择钱包并授权

2. **添加好友**
   - 点击导航栏的 "Friends" 按钮
   - 输入好友的钱包地址
   - 发送好友请求

3. **接受好友请求**
   - 在 Friends 弹窗中查看待处理请求
   - 点击 ✓ 接受请求
   - 系统会自动初始化双方的 profiles

4. **开始聊天**
   - 进入 Chat 页面
   - 选择好友开始聊天
   - 输入消息并发送
   - 所有消息自动保存到区块链

## 区块链集成

### 聊天室 (ChatRoom)
- 每对好友有一个唯一的聊天室
- PDA: `[b"chat_room", user_a, user_b]`
- 存储消息计数和最后消息时间

### 消息 (Message)
- 每条消息是一个独立的账户
- PDA: `[b"message", chat_room, message_index]`
- 存储内容、发送者、时间戳

### 费用
- 初始化聊天室: ~0.002 SOL
- 发送消息: ~0.003 SOL
- 所有费用由发送者支付

## 技术栈

- **前端**: Next.js + React
- **UI**: Tailwind CSS + shadcn/ui
- **区块链**: Solana + Anchor
- **钱包**: Solana Wallet Adapter

## 文件结构

```
frontend/
├── pages/
│   └── chat.js                 # 聊天主页面
├── components/
│   ├── chat-sidebar.js         # 左侧聊天列表
│   ├── chat-window.js          # 右侧聊天窗口
│   └── friends-modal.js        # 好友管理弹窗
└── lib/
    └── solana/
        └── hooks/
            ├── useChatProgram.js    # 聊天相关 hooks
            └── useSocialProgram.js  # 好友相关 hooks
```

## 下一步改进

- [ ] 实时消息推送（WebSocket）
- [ ] 消息已读状态
- [ ] 图片/文件发送
- [ ] 消息搜索
- [ ] 聊天室设置
- [ ] AI 集成（真实 AI 服务）
- [ ] 消息加密

use anchor_lang::prelude::*;

declare_id!("ETsJTuFTVWRPW9xoMozFQxwuEpJXN3Z9xnWxdV7rcLcz");

#[program]
pub mod solamate_program {
    use super::*;

    // ============================================================================
    // SOCIAL PROGRAM - 社交系统
    // ============================================================================

    /// 初始化用户档案 (连接钱包自动创建)
    pub fn initialize_profile(ctx: Context<InitializeProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        profile.owner = ctx.accounts.user.key();
        profile.pet_id = 0; // 未选择宠物
        profile.friend_count = 0;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.bump = ctx.bumps.user_profile;
        
        msg!("User profile created for: {}", profile.owner);
        Ok(())
    }

    /// 选择宠物
    pub fn select_pet(ctx: Context<SelectPet>, pet_id: u8) -> Result<()> {
        require!(pet_id >= 1 && pet_id <= 10, ErrorCode::InvalidPetId);
        
        let profile = &mut ctx.accounts.user_profile;
        profile.pet_id = pet_id;
        
        msg!("User {} selected pet #{}", profile.owner, pet_id);
        Ok(())
    }

    /// 发送好友请求
    pub fn send_friend_request(ctx: Context<SendFriendRequest>, user_a: Pubkey, user_b: Pubkey) -> Result<()> {
        let friendship = &mut ctx.accounts.friendship;
        let sender = ctx.accounts.user.key();
        let friend = ctx.accounts.friend.key();
        
        // 验证传入的排序后的 keys 匹配实际用户
        require!(user_a < user_b, ErrorCode::InvalidKeyOrder);
        require!(
            (sender == user_a && friend == user_b) || (sender == user_b && friend == user_a),
            ErrorCode::InvalidKeyOrder
        );
        
        friendship.user_a = user_a;
        friendship.user_b = user_b;
        friendship.requester = sender; // 记录发送者
        friendship.status = FriendshipStatus::Pending;
        friendship.created_at = Clock::get()?.unix_timestamp;
        friendship.bump = ctx.bumps.friendship;
        
        msg!("Friend request sent from {} to {}", sender, friend);
        Ok(())
    }

    /// 接受好友请求（自动初始化缺失的 profiles）
    pub fn accept_friend_request(ctx: Context<AcceptFriendRequest>) -> Result<()> {
        let friendship = &mut ctx.accounts.friendship;
        
        require!(
            friendship.status == FriendshipStatus::Pending,
            ErrorCode::FriendshipAlreadyAccepted
        );
        
        friendship.status = FriendshipStatus::Accepted;
        
        // 如果 profile 是新创建的，初始化它
        let user_a_profile = &mut ctx.accounts.user_a_profile;
        if user_a_profile.owner == Pubkey::default() {
            user_a_profile.owner = friendship.user_a;
            user_a_profile.pet_id = 0;
            user_a_profile.friend_count = 0;
            user_a_profile.created_at = Clock::get()?.unix_timestamp;
            user_a_profile.bump = ctx.bumps.user_a_profile;
            msg!("Auto-initialized profile for user_a: {}", friendship.user_a);
        }
        
        let user_b_profile = &mut ctx.accounts.user_b_profile;
        if user_b_profile.owner == Pubkey::default() {
            user_b_profile.owner = friendship.user_b;
            user_b_profile.pet_id = 0;
            user_b_profile.friend_count = 0;
            user_b_profile.created_at = Clock::get()?.unix_timestamp;
            user_b_profile.bump = ctx.bumps.user_b_profile;
            msg!("Auto-initialized profile for user_b: {}", friendship.user_b);
        }
        
        // 更新双方好友计数
        user_a_profile.friend_count += 1;
        user_b_profile.friend_count += 1;
        
        msg!("Friendship accepted between {} and {}", friendship.user_a, friendship.user_b);
        Ok(())
    }

    /// 移除好友
    pub fn remove_friend(ctx: Context<RemoveFriend>) -> Result<()> {
        // 减少好友计数
        ctx.accounts.user_a_profile.friend_count = ctx.accounts.user_a_profile.friend_count.saturating_sub(1);
        ctx.accounts.user_b_profile.friend_count = ctx.accounts.user_b_profile.friend_count.saturating_sub(1);
        
        msg!("Friendship removed between {} and {}", 
            ctx.accounts.friendship.user_a, 
            ctx.accounts.friendship.user_b
        );
        Ok(())
    }

    // ============================================================================
    // CHAT PROGRAM - 聊天系统
    // ============================================================================

    /// 初始化聊天室 (首次聊天时调用)
    pub fn initialize_chat_room(ctx: Context<InitializeChatRoom>) -> Result<()> {
        let chat_room = &mut ctx.accounts.chat_room;
        let user_a = ctx.accounts.user_a.key();
        let user_b = ctx.accounts.user_b.key();
        
        // 确保 user_a < user_b (字母序)
        let (min_user, max_user) = if user_a < user_b {
            (user_a, user_b)
        } else {
            (user_b, user_a)
        };
        
        chat_room.user_a = min_user;
        chat_room.user_b = max_user;
        chat_room.message_count = 0;
        chat_room.last_message_at = 0;
        chat_room.bump = ctx.bumps.chat_room;
        
        msg!("Chat room created between {} and {}", min_user, max_user);
        Ok(())
    }

    /// 发送消息
    pub fn send_message(ctx: Context<SendMessage>, content: String) -> Result<()> {
        require!(content.len() > 0 && content.len() <= 500, ErrorCode::InvalidMessageLength);
        
        let chat_room = &mut ctx.accounts.chat_room;
        let message = &mut ctx.accounts.message;
        let sender = ctx.accounts.sender.key();
        
        // 验证发送者是聊天室成员
        require!(
            sender == chat_room.user_a || sender == chat_room.user_b,
            ErrorCode::NotChatRoomMember
        );
        
        // 设置消息数据
        message.chat_room = chat_room.key();
        message.sender = sender;
        message.content = content;
        message.message_index = chat_room.message_count;
        message.timestamp = Clock::get()?.unix_timestamp;
        message.bump = ctx.bumps.message;
        
        // 更新聊天室
        chat_room.message_count += 1;
        chat_room.last_message_at = message.timestamp;
        
        msg!("Message #{} sent in chat room {}", message.message_index, chat_room.key());
        Ok(())
    }

    /// 删除消息 (可选功能)
    pub fn delete_message(ctx: Context<DeleteMessage>) -> Result<()> {
        let message = &ctx.accounts.message;
        let sender = ctx.accounts.sender.key();
        
        // 只有发送者可以删除自己的消息
        require!(message.sender == sender, ErrorCode::Unauthorized);
        
        msg!("Message #{} deleted", message.message_index);
        Ok(())
    }

    // ============================================================================
    // EXPENSE PROGRAM - 消费追踪
    // ============================================================================

    /// 初始化消费统计账户
    pub fn initialize_expense_stats(ctx: Context<InitializeExpenseStats>) -> Result<()> {
        let stats = &mut ctx.accounts.expense_stats;
        
        stats.owner = ctx.accounts.user.key();
        stats.total_spent = 0;
        stats.record_count = 0;
        stats.dining_total = 0;
        stats.shopping_total = 0;
        stats.entertainment_total = 0;
        stats.travel_total = 0;
        stats.gifts_total = 0;
        stats.bills_total = 0;
        stats.other_total = 0;
        stats.last_updated = Clock::get()?.unix_timestamp;
        stats.bump = ctx.bumps.expense_stats;
        
        msg!("Expense stats initialized for: {}", stats.owner);
        Ok(())
    }

    /// 记录消费
    pub fn record_expense(
        ctx: Context<RecordExpense>,
        amount: u64,
        category: ExpenseCategory,
        description: String,
        tx_signature: String,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(description.len() <= 100, ErrorCode::DescriptionTooLong);
        require!(tx_signature.len() > 0, ErrorCode::InvalidSignature);
        
        let record = &mut ctx.accounts.expense_record;
        let stats = &mut ctx.accounts.expense_stats;
        
        // 设置消费记录
        record.owner = ctx.accounts.user.key();
        record.recipient = ctx.accounts.recipient.key();
        record.amount = amount;
        record.category = category.clone();
        record.description = description;
        record.tx_signature = tx_signature;
        record.record_index = stats.record_count;
        record.timestamp = Clock::get()?.unix_timestamp;
        record.bump = ctx.bumps.expense_record;
        
        // 更新统计数据
        stats.total_spent = stats.total_spent.checked_add(amount).unwrap();
        stats.record_count += 1;
        
        // 更新分类统计
        match category {
            ExpenseCategory::Dining => {
                stats.dining_total = stats.dining_total.checked_add(amount).unwrap();
            }
            ExpenseCategory::Shopping => {
                stats.shopping_total = stats.shopping_total.checked_add(amount).unwrap();
            }
            ExpenseCategory::Entertainment => {
                stats.entertainment_total = stats.entertainment_total.checked_add(amount).unwrap();
            }
            ExpenseCategory::Travel => {
                stats.travel_total = stats.travel_total.checked_add(amount).unwrap();
            }
            ExpenseCategory::Gifts => {
                stats.gifts_total = stats.gifts_total.checked_add(amount).unwrap();
            }
            ExpenseCategory::Bills => {
                stats.bills_total = stats.bills_total.checked_add(amount).unwrap();
            }
            ExpenseCategory::Other => {
                stats.other_total = stats.other_total.checked_add(amount).unwrap();
            }
        }
        
        stats.last_updated = record.timestamp;
        
        msg!("Expense recorded: {} lamports for {:?}", amount, category);
        Ok(())
    }

    /// 删除消费记录 (可选)
    pub fn delete_expense_record(ctx: Context<DeleteExpenseRecord>) -> Result<()> {
        let record = &ctx.accounts.expense_record;
        let stats = &mut ctx.accounts.expense_stats;
        
        // 从统计中减去
        stats.total_spent = stats.total_spent.saturating_sub(record.amount);
        stats.record_count = stats.record_count.saturating_sub(1);
        
        // 从分类统计中减去
        match record.category {
            ExpenseCategory::Dining => {
                stats.dining_total = stats.dining_total.saturating_sub(record.amount);
            }
            ExpenseCategory::Shopping => {
                stats.shopping_total = stats.shopping_total.saturating_sub(record.amount);
            }
            ExpenseCategory::Entertainment => {
                stats.entertainment_total = stats.entertainment_total.saturating_sub(record.amount);
            }
            ExpenseCategory::Travel => {
                stats.travel_total = stats.travel_total.saturating_sub(record.amount);
            }
            ExpenseCategory::Gifts => {
                stats.gifts_total = stats.gifts_total.saturating_sub(record.amount);
            }
            ExpenseCategory::Bills => {
                stats.bills_total = stats.bills_total.saturating_sub(record.amount);
            }
            ExpenseCategory::Other => {
                stats.other_total = stats.other_total.saturating_sub(record.amount);
            }
        }
        
        stats.last_updated = Clock::get()?.unix_timestamp;
        
        msg!("Expense record #{} deleted", record.record_index);
        Ok(())
    }
}

// ============================================================================
// ACCOUNT STRUCTURES - 账户结构
// ============================================================================

// --- Social Program Accounts ---

#[account]
pub struct UserProfile {
    pub owner: Pubkey,          // 32
    pub pet_id: u8,             // 1
    pub friend_count: u32,      // 4
    pub created_at: i64,        // 8
    pub bump: u8,               // 1
}

impl UserProfile {
    pub const LEN: usize = 8 + 32 + 1 + 4 + 8 + 1; // 54 bytes
}

#[account]
pub struct Friendship {
    pub user_a: Pubkey,         // 32
    pub user_b: Pubkey,         // 32
    pub requester: Pubkey,      // 32 - 记录谁发送的请求
    pub status: FriendshipStatus, // 1
    pub created_at: i64,        // 8
    pub bump: u8,               // 1
}

impl Friendship {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 8 + 1; // 114 bytes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum FriendshipStatus {
    Pending,
    Accepted,
}

// --- Chat Program Accounts ---

#[account]
pub struct ChatRoom {
    pub user_a: Pubkey,         // 32
    pub user_b: Pubkey,         // 32
    pub message_count: u64,     // 8
    pub last_message_at: i64,   // 8
    pub bump: u8,               // 1
}

impl ChatRoom {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1; // 89 bytes
}

#[account]
pub struct Message {
    pub chat_room: Pubkey,      // 32
    pub sender: Pubkey,         // 32
    pub content: String,        // 4 + 500 = 504
    pub message_index: u64,     // 8
    pub timestamp: i64,         // 8
    pub bump: u8,               // 1
}

impl Message {
    pub const LEN: usize = 8 + 32 + 32 + 504 + 8 + 8 + 1; // 593 bytes
}

// --- Expense Program Accounts ---

#[account]
pub struct ExpenseRecord {
    pub owner: Pubkey,          // 32
    pub recipient: Pubkey,      // 32
    pub amount: u64,            // 8
    pub category: ExpenseCategory, // 1
    pub description: String,    // 4 + 100 = 104
    pub timestamp: i64,         // 8
    pub tx_signature: String,   // 4 + 88 = 92
    pub record_index: u64,      // 8
    pub bump: u8,               // 1
}

impl ExpenseRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 104 + 8 + 92 + 8 + 1; // 294 bytes
}

#[account]
pub struct ExpenseStats {
    pub owner: Pubkey,          // 32
    pub total_spent: u64,       // 8
    pub record_count: u64,      // 8
    pub dining_total: u64,      // 8
    pub shopping_total: u64,    // 8
    pub entertainment_total: u64, // 8
    pub travel_total: u64,      // 8
    pub gifts_total: u64,       // 8
    pub bills_total: u64,       // 8
    pub other_total: u64,       // 8
    pub last_updated: i64,      // 8
    pub bump: u8,               // 1
}

impl ExpenseStats {
    pub const LEN: usize = 8 + 32 + 8 + 8 + (8 * 7) + 8 + 1; // 121 bytes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ExpenseCategory {
    Dining,
    Shopping,
    Entertainment,
    Travel,
    Gifts,
    Bills,
    Other,
}

// ============================================================================
// CONTEXT STRUCTURES - 上下文结构
// ============================================================================

// --- Social Program Contexts ---

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = user,
        space = UserProfile::LEN,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SelectPet<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump = user_profile.bump,
        has_one = owner @ ErrorCode::Unauthorized
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: This is the owner field in user_profile
    pub owner: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(user_a: Pubkey, user_b: Pubkey)]
pub struct SendFriendRequest<'info> {
    #[account(
        init,
        payer = user,
        space = Friendship::LEN,
        seeds = [b"friendship", user_a.as_ref(), user_b.as_ref()],
        bump
    )]
    pub friendship: Account<'info, Friendship>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Friend's public key
    pub friend: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptFriendRequest<'info> {
    #[account(
        mut,
        seeds = [
            b"friendship",
            friendship.user_a.as_ref(),
            friendship.user_b.as_ref()
        ],
        bump = friendship.bump
    )]
    pub friendship: Account<'info, Friendship>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = UserProfile::LEN,
        seeds = [b"user_profile", friendship.user_a.as_ref()],
        bump
    )]
    pub user_a_profile: Account<'info, UserProfile>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = UserProfile::LEN,
        seeds = [b"user_profile", friendship.user_b.as_ref()],
        bump
    )]
    pub user_b_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFriend<'info> {
    #[account(
        mut,
        close = user,
        seeds = [
            b"friendship",
            friendship.user_a.as_ref(),
            friendship.user_b.as_ref()
        ],
        bump = friendship.bump
    )]
    pub friendship: Account<'info, Friendship>,
    
    #[account(
        mut,
        seeds = [b"user_profile", friendship.user_a.as_ref()],
        bump = user_a_profile.bump
    )]
    pub user_a_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"user_profile", friendship.user_b.as_ref()],
        bump = user_b_profile.bump
    )]
    pub user_b_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

// --- Chat Program Contexts ---

#[derive(Accounts)]
pub struct InitializeChatRoom<'info> {
    #[account(
        init,
        payer = payer,
        space = ChatRoom::LEN,
        seeds = [b"chat_room", user_a.key().as_ref(), user_b.key().as_ref()],
        bump
    )]
    pub chat_room: Account<'info, ChatRoom>,
    
    /// CHECK: User A's public key
    pub user_a: AccountInfo<'info>,
    
    /// CHECK: User B's public key
    pub user_b: AccountInfo<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendMessage<'info> {
    #[account(
        mut,
        seeds = [
            b"chat_room",
            chat_room.user_a.as_ref(),
            chat_room.user_b.as_ref()
        ],
        bump = chat_room.bump
    )]
    pub chat_room: Account<'info, ChatRoom>,
    
    #[account(
        init,
        payer = sender,
        space = Message::LEN,
        seeds = [
            b"message",
            chat_room.key().as_ref(),
            chat_room.message_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub message: Account<'info, Message>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteMessage<'info> {
    #[account(
        mut,
        close = sender,
        seeds = [
            b"message",
            message.chat_room.as_ref(),
            message.message_index.to_le_bytes().as_ref()
        ],
        bump = message.bump,
        has_one = sender @ ErrorCode::Unauthorized
    )]
    pub message: Account<'info, Message>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
}

// --- Expense Program Contexts ---

#[derive(Accounts)]
pub struct InitializeExpenseStats<'info> {
    #[account(
        init,
        payer = user,
        space = ExpenseStats::LEN,
        seeds = [b"expense_stats", user.key().as_ref()],
        bump
    )]
    pub expense_stats: Account<'info, ExpenseStats>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordExpense<'info> {
    #[account(
        init,
        payer = user,
        space = ExpenseRecord::LEN,
        seeds = [
            b"expense_record",
            user.key().as_ref(),
            expense_stats.record_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub expense_record: Account<'info, ExpenseRecord>,
    
    #[account(
        mut,
        seeds = [b"expense_stats", user.key().as_ref()],
        bump = expense_stats.bump,
        has_one = owner @ ErrorCode::Unauthorized
    )]
    pub expense_stats: Account<'info, ExpenseStats>,
    
    /// CHECK: This is the owner field in expense_stats
    pub owner: AccountInfo<'info>,
    
    /// CHECK: Recipient's public key
    pub recipient: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteExpenseRecord<'info> {
    #[account(
        mut,
        close = user,
        seeds = [
            b"expense_record",
            expense_record.owner.as_ref(),
            expense_record.record_index.to_le_bytes().as_ref()
        ],
        bump = expense_record.bump,
        has_one = owner @ ErrorCode::Unauthorized
    )]
    pub expense_record: Account<'info, ExpenseRecord>,
    
    #[account(
        mut,
        seeds = [b"expense_stats", user.key().as_ref()],
        bump = expense_stats.bump
    )]
    pub expense_stats: Account<'info, ExpenseStats>,
    
    /// CHECK: This is the owner field in expense_record
    pub owner: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

// ============================================================================
// ERROR CODES - 错误代码
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Pet ID must be between 1 and 10")]
    InvalidPetId,
    
    #[msg("Friendship already accepted")]
    FriendshipAlreadyAccepted,
    
    #[msg("Message must be 1-500 characters")]
    InvalidMessageLength,
    
    #[msg("You are not a member of this chat room")]
    NotChatRoomMember,
    
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    
    #[msg("Description must be 100 characters or less")]
    DescriptionTooLong,
    
    #[msg("Transaction signature is required")]
    InvalidSignature,
    
    #[msg("Unauthorized: You are not the owner")]
    Unauthorized,
    
    #[msg("Keys must be provided in sorted order")]
    InvalidKeyOrder,
}

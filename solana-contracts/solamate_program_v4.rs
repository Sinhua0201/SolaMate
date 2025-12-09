use anchor_lang::prelude::*;

declare_id!("GNz2osDczKfNJzWCRQRnTTLXoA92iY1QNmnDmt1Qo9c7i");

#[program]
pub mod solamate_program {
    use super::*;

    // ============================================================================
    // SOCIAL PROGRAM - 好友系统
    // ============================================================================

    pub fn send_friend_request(ctx: Context<SendFriendRequest>) -> Result<()> {
        let friendship = &mut ctx.accounts.friendship;
        let user_a = ctx.accounts.user.key();
        let user_b = ctx.accounts.friend.key();
        
        let (min_user, max_user) = if user_a < user_b {
            (user_a, user_b)
        } else {
            (user_b, user_a)
        };
        
        friendship.user_a = min_user;
        friendship.user_b = max_user;
        friendship.status = FriendshipStatus::Pending;
        friendship.requester = user_a;
        friendship.created_at = Clock::get()?.unix_timestamp;
        friendship.bump = ctx.bumps.friendship;
        
        msg!("Friend request sent from {} to {}", user_a, user_b);
        Ok(())
    }

    pub fn accept_friend_request(ctx: Context<AcceptFriendRequest>) -> Result<()> {
        let friendship = &mut ctx.accounts.friendship;
        
        require!(
            friendship.status == FriendshipStatus::Pending,
            ErrorCode::FriendshipAlreadyAccepted
        );
        
        friendship.status = FriendshipStatus::Accepted;
        
        msg!("Friendship accepted between {} and {}", friendship.user_a, friendship.user_b);
        Ok(())
    }

    pub fn remove_friend(ctx: Context<RemoveFriend>) -> Result<()> {
        msg!("Friendship removed");
        Ok(())
    }

    // ============================================================================
    // CHAT PROGRAM - 聊天系统
    // ============================================================================

    pub fn initialize_chat_room(ctx: Context<InitializeChatRoom>) -> Result<()> {
        let chat_room = &mut ctx.accounts.chat_room;
        let user_a = ctx.accounts.user_a.key();
        let user_b = ctx.accounts.user_b.key();
        
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
        
        msg!("Chat room created");
        Ok(())
    }

    pub fn send_message(ctx: Context<SendMessage>, content: String) -> Result<()> {
        require!(content.len() > 0 && content.len() <= 500, ErrorCode::InvalidMessageLength);
        
        let chat_room = &mut ctx.accounts.chat_room;
        let message = &mut ctx.accounts.message;
        
        message.chat_room = chat_room.key();
        message.sender = ctx.accounts.sender.key();
        message.content = content;
        message.timestamp = Clock::get()?.unix_timestamp;
        message.bump = ctx.bumps.message;
        
        chat_room.message_count += 1;
        chat_room.last_message_at = message.timestamp;
        
        Ok(())
    }

    pub fn delete_message(ctx: Context<DeleteMessage>) -> Result<()> {
        Ok(())
    }

    // ============================================================================
    // EXPENSE PROGRAM - 消费追踪
    // ============================================================================

    pub fn initialize_expense_stats(ctx: Context<InitializeExpenseStats>) -> Result<()> {
        let stats = &mut ctx.accounts.expense_stats;
        stats.owner = ctx.accounts.owner.key();
        stats.total_spent = 0;
        stats.total_received = 0;
        stats.transaction_count = 0;
        stats.bump = ctx.bumps.expense_stats;
        Ok(())
    }

    pub fn record_expense(
        ctx: Context<RecordExpense>,
        amount: u64,
        category: ExpenseCategory,
        description: String,
        tx_signature: String,
    ) -> Result<()> {
        let expense = &mut ctx.accounts.expense_record;
        let stats = &mut ctx.accounts.expense_stats;
        
        expense.owner = ctx.accounts.owner.key();
        expense.recipient = ctx.accounts.recipient.key();
        expense.amount = amount;
        expense.category = category;
        expense.description = description;
        expense.tx_signature = tx_signature;
        expense.timestamp = Clock::get()?.unix_timestamp;
        expense.bump = ctx.bumps.expense_record;
        
        stats.total_spent += amount;
        stats.transaction_count += 1;
        
        Ok(())
    }

    pub fn delete_expense_record(ctx: Context<DeleteExpenseRecord>) -> Result<()> {
        Ok(())
    }

    // ============================================================================
    // FUNDING EVENTS - 福利社/众筹系统 (新功能)
    // ============================================================================

    /// 创建福利活动
    pub fn create_funding_event(
        ctx: Context<CreateFundingEvent>,
        title: String,
        amount: u64,
        deadline: i64,
        ipfs_hash: String,
    ) -> Result<()> {
        require!(title.len() > 0 && title.len() <= 64, ErrorCode::InvalidTitle);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(ipfs_hash.len() > 0 && ipfs_hash.len() <= 64, ErrorCode::InvalidIPFSHash);
        
        let event = &mut ctx.accounts.funding_event;
        let creator = ctx.accounts.creator.key();
        
        event.creator = creator;
        event.title = title;
        event.total_amount = amount;
        event.remaining_amount = amount;
        event.deadline = deadline;
        event.ipfs_hash = ipfs_hash;
        event.status = EventStatus::Active;
        event.created_at = Clock::get()?.unix_timestamp;
        event.application_count = 0;
        event.approved_count = 0;
        event.bump = ctx.bumps.funding_event;
        
        // 转账 SOL 到活动账户
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.creator.key(),
            &event.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.creator.to_account_info(),
                event.to_account_info(),
            ],
        )?;
        
        msg!("Funding event created: {} with {} lamports", event.title, amount);
        Ok(())
    }

    /// 申请资助
    pub fn apply_for_funding(
        ctx: Context<ApplyForFunding>,
        requested_amount: u64,
        ipfs_hash: String,
    ) -> Result<()> {
        require!(requested_amount > 0, ErrorCode::InvalidAmount);
        require!(ipfs_hash.len() > 0 && ipfs_hash.len() <= 64, ErrorCode::InvalidIPFSHash);
        
        let event = &mut ctx.accounts.funding_event;
        let application = &mut ctx.accounts.application;
        
        require!(event.status == EventStatus::Active, ErrorCode::EventNotActive);
        require!(
            Clock::get()?.unix_timestamp < event.deadline,
            ErrorCode::EventExpired
        );
        
        application.event = event.key();
        application.applicant = ctx.accounts.applicant.key();
        application.requested_amount = requested_amount;
        application.approved_amount = 0;
        application.ipfs_hash = ipfs_hash;
        application.status = ApplicationStatus::Pending;
        application.applied_at = Clock::get()?.unix_timestamp;
        application.bump = ctx.bumps.application;
        
        event.application_count += 1;
        
        msg!("Application submitted for event: {}", event.title);
        Ok(())
    }

    /// 批准申请
    pub fn approve_application(
        ctx: Context<ApproveApplication>,
        approved_amount: u64,
    ) -> Result<()> {
        let event = &mut ctx.accounts.funding_event;
        let application = &mut ctx.accounts.application;
        
        require!(
            ctx.accounts.creator.key() == event.creator,
            ErrorCode::Unauthorized
        );
        require!(
            application.status == ApplicationStatus::Pending,
            ErrorCode::ApplicationAlreadyProcessed
        );
        require!(
            approved_amount <= event.remaining_amount,
            ErrorCode::InsufficientFunds
        );
        
        application.approved_amount = approved_amount;
        application.status = ApplicationStatus::Approved;
        event.approved_count += 1;
        
        msg!("Application approved: {} lamports", approved_amount);
        Ok(())
    }

    /// 拒绝申请
    pub fn reject_application(ctx: Context<RejectApplication>) -> Result<()> {
        let event = &ctx.accounts.funding_event;
        let application = &mut ctx.accounts.application;
        
        require!(
            ctx.accounts.creator.key() == event.creator,
            ErrorCode::Unauthorized
        );
        require!(
            application.status == ApplicationStatus::Pending,
            ErrorCode::ApplicationAlreadyProcessed
        );
        
        application.status = ApplicationStatus::Rejected;
        
        msg!("Application rejected");
        Ok(())
    }

    /// 发放资金
    pub fn disburse_funds(ctx: Context<DisburseFunds>) -> Result<()> {
        let event = &mut ctx.accounts.funding_event;
        let application = &mut ctx.accounts.application;
        
        require!(
            application.status == ApplicationStatus::Approved,
            ErrorCode::ApplicationNotApproved
        );
        require!(
            application.approved_amount <= event.remaining_amount,
            ErrorCode::InsufficientFunds
        );
        
        let amount = application.approved_amount;
        
        // 从活动账户转账到申请者
        **event.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.applicant.to_account_info().try_borrow_mut_lamports()? += amount;
        
        event.remaining_amount -= amount;
        application.status = ApplicationStatus::Paid;
        
        msg!("Funds disbursed: {} lamports to {}", amount, application.applicant);
        Ok(())
    }

    /// 关闭活动（退回剩余资金）
    pub fn close_event(ctx: Context<CloseEvent>) -> Result<()> {
        let event = &mut ctx.accounts.funding_event;
        
        require!(
            ctx.accounts.creator.key() == event.creator,
            ErrorCode::Unauthorized
        );
        
        let remaining = event.remaining_amount;
        
        if remaining > 0 {
            **event.to_account_info().try_borrow_mut_lamports()? -= remaining;
            **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += remaining;
        }
        
        event.status = EventStatus::Closed;
        event.remaining_amount = 0;
        
        msg!("Event closed, {} lamports returned to creator", remaining);
        Ok(())
    }
}

// ============================================================================
// ACCOUNT STRUCTURES
// ============================================================================

#[account]
pub struct Friendship {
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub status: FriendshipStatus,
    pub requester: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ChatRoom {
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub message_count: u64,
    pub last_message_at: i64,
    pub bump: u8,
}

#[account]
pub struct Message {
    pub chat_room: Pubkey,
    pub sender: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
pub struct ExpenseRecord {
    pub owner: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub category: ExpenseCategory,
    pub description: String,
    pub tx_signature: String,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
pub struct ExpenseStats {
    pub owner: Pubkey,
    pub total_spent: u64,
    pub total_received: u64,
    pub transaction_count: u64,
    pub bump: u8,
}

// 新增：福利活动账户
#[account]
pub struct FundingEvent {
    pub creator: Pubkey,              // 32
    pub title: String,                // 4 + 64
    pub total_amount: u64,            // 8
    pub remaining_amount: u64,        // 8
    pub deadline: i64,                // 8
    pub ipfs_hash: String,            // 4 + 64 (存储详细信息)
    pub status: EventStatus,          // 1
    pub created_at: i64,              // 8
    pub application_count: u32,       // 4
    pub approved_count: u32,          // 4
    pub bump: u8,                     // 1
}

// 新增：申请账户
#[account]
pub struct Application {
    pub event: Pubkey,                // 32
    pub applicant: Pubkey,            // 32
    pub requested_amount: u64,        // 8
    pub approved_amount: u64,         // 8
    pub ipfs_hash: String,            // 4 + 64 (存储申请表格和文件)
    pub status: ApplicationStatus,    // 1
    pub applied_at: i64,              // 8
    pub bump: u8,                     // 1
}

// ============================================================================
// ENUMS
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum FriendshipStatus {
    Pending,
    Accepted,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ExpenseCategory {
    Dining,
    Shopping,
    Entertainment,
    Travel,
    Gifts,
    Bills,
    Other,
}

// 新增：活动状态
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EventStatus {
    Active,
    Closed,
}

// 新增：申请状态
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ApplicationStatus {
    Pending,
    Approved,
    Rejected,
    Paid,
}

// ============================================================================
// CONTEXT STRUCTURES
// ============================================================================

#[derive(Accounts)]
pub struct SendFriendRequest<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 1 + 32 + 8 + 1,
        seeds = [b"friendship", user_a.key().as_ref(), user_b.key().as_ref()],
        bump
    )]
    pub friendship: Account<'info, Friendship>,
    
    /// CHECK: user_a (排序后的较小地址)
    pub user_a: AccountInfo<'info>,
    /// CHECK: user_b (排序后的较大地址)
    pub user_b: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: friend
    pub friend: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptFriendRequest<'info> {
    #[account(
        mut,
        seeds = [b"friendship", friendship.user_a.as_ref(), friendship.user_b.as_ref()],
        bump = friendship.bump
    )]
    pub friendship: Account<'info, Friendship>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveFriend<'info> {
    #[account(
        mut,
        close = user,
        seeds = [b"friendship", friendship.user_a.as_ref(), friendship.user_b.as_ref()],
        bump = friendship.bump
    )]
    pub friendship: Account<'info, Friendship>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeChatRoom<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"chat_room", user_a.key().as_ref(), user_b.key().as_ref()],
        bump
    )]
    pub chat_room: Account<'info, ChatRoom>,
    
    /// CHECK: user_a
    pub user_a: AccountInfo<'info>,
    /// CHECK: user_b
    pub user_b: AccountInfo<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendMessage<'info> {
    #[account(
        mut,
        seeds = [b"chat_room", chat_room.user_a.as_ref(), chat_room.user_b.as_ref()],
        bump = chat_room.bump
    )]
    pub chat_room: Account<'info, ChatRoom>,
    
    #[account(
        init,
        payer = sender,
        space = 8 + 32 + 32 + 504 + 8 + 1,
        seeds = [
            b"message",
            chat_room.key().as_ref(),
            &chat_room.message_count.to_le_bytes()
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
        seeds = [b"message", message.chat_room.as_ref(), &[0u8; 8]],
        bump = message.bump
    )]
    pub message: Account<'info, Message>,
    #[account(mut)]
    pub sender: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeExpenseStats<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"expense_stats", owner.key().as_ref()],
        bump
    )]
    pub expense_stats: Account<'info, ExpenseStats>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordExpense<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 1 + 204 + 104 + 8 + 1,
        seeds = [
            b"expense",
            owner.key().as_ref(),
            &expense_stats.transaction_count.to_le_bytes()
        ],
        bump
    )]
    pub expense_record: Account<'info, ExpenseRecord>,
    
    #[account(
        mut,
        seeds = [b"expense_stats", owner.key().as_ref()],
        bump = expense_stats.bump
    )]
    pub expense_stats: Account<'info, ExpenseStats>,
    
    /// CHECK: recipient
    pub recipient: AccountInfo<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteExpenseRecord<'info> {
    #[account(
        mut,
        close = owner,
        seeds = [b"expense", expense_record.owner.as_ref(), &[0u8; 8]],
        bump = expense_record.bump
    )]
    pub expense_record: Account<'info, ExpenseRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

// ============================================================================
// 新增：福利社相关的 Context
// ============================================================================

#[derive(Accounts)]
pub struct CreateFundingEvent<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 68 + 8 + 8 + 8 + 68 + 1 + 8 + 4 + 4 + 1,
        seeds = [
            b"funding_event",
            creator.key().as_ref(),
            &Clock::get().unwrap().unix_timestamp.to_le_bytes()
        ],
        bump
    )]
    pub funding_event: Account<'info, FundingEvent>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApplyForFunding<'info> {
    #[account(
        mut,
        seeds = [
            b"funding_event",
            funding_event.creator.as_ref(),
            &funding_event.created_at.to_le_bytes()
        ],
        bump = funding_event.bump
    )]
    pub funding_event: Account<'info, FundingEvent>,
    
    #[account(
        init,
        payer = applicant,
        space = 8 + 32 + 32 + 8 + 8 + 68 + 1 + 8 + 1,
        seeds = [
            b"application",
            funding_event.key().as_ref(),
            applicant.key().as_ref()
        ],
        bump
    )]
    pub application: Account<'info, Application>,
    
    #[account(mut)]
    pub applicant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveApplication<'info> {
    #[account(
        mut,
        seeds = [
            b"funding_event",
            funding_event.creator.as_ref(),
            &funding_event.created_at.to_le_bytes()
        ],
        bump = funding_event.bump
    )]
    pub funding_event: Account<'info, FundingEvent>,
    
    #[account(
        mut,
        seeds = [
            b"application",
            funding_event.key().as_ref(),
            application.applicant.as_ref()
        ],
        bump = application.bump
    )]
    pub application: Account<'info, Application>,
    
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct RejectApplication<'info> {
    #[account(
        seeds = [
            b"funding_event",
            funding_event.creator.as_ref(),
            &funding_event.created_at.to_le_bytes()
        ],
        bump = funding_event.bump
    )]
    pub funding_event: Account<'info, FundingEvent>,
    
    #[account(
        mut,
        seeds = [
            b"application",
            funding_event.key().as_ref(),
            application.applicant.as_ref()
        ],
        bump = application.bump
    )]
    pub application: Account<'info, Application>,
    
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct DisburseFunds<'info> {
    #[account(
        mut,
        seeds = [
            b"funding_event",
            funding_event.creator.as_ref(),
            &funding_event.created_at.to_le_bytes()
        ],
        bump = funding_event.bump
    )]
    pub funding_event: Account<'info, FundingEvent>,
    
    #[account(
        mut,
        seeds = [
            b"application",
            funding_event.key().as_ref(),
            application.applicant.as_ref()
        ],
        bump = application.bump
    )]
    pub application: Account<'info, Application>,
    
    /// CHECK: applicant
    #[account(mut)]
    pub applicant: AccountInfo<'info>,
    
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseEvent<'info> {
    #[account(
        mut,
        seeds = [
            b"funding_event",
            funding_event.creator.as_ref(),
            &funding_event.created_at.to_le_bytes()
        ],
        bump = funding_event.bump
    )]
    pub funding_event: Account<'info, FundingEvent>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Friendship already accepted")]
    FriendshipAlreadyAccepted,
    #[msg("Invalid message length")]
    InvalidMessageLength,
    #[msg("Not a member of this chat room")]
    NotChatRoomMember,
    #[msg("Invalid title")]
    InvalidTitle,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid IPFS hash")]
    InvalidIPFSHash,
    #[msg("Event is not active")]
    EventNotActive,
    #[msg("Event has expired")]
    EventExpired,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Application already processed")]
    ApplicationAlreadyProcessed,
    #[msg("Insufficient funds in event")]
    InsufficientFunds,
    #[msg("Application not approved")]
    ApplicationNotApproved,
}

use anchor_lang::prelude::*;

declare_id!("ETsJTuFTVWRPW9xoMozFQxwuEpJXN3Z9xnWxdV7rcLcz");

#[program]
pub mod solamate_program {
    use super::*;

    // ============================================================================
    // SOCIAL PROGRAM - 社交系统
    // ============================================================================

    pub fn initialize_profile(ctx: Context<InitializeProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        profile.owner = ctx.accounts.user.key();
        profile.pet_id = 0;
        profile.friend_count = 0;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.bump = ctx.bumps.user_profile;
        
        msg!("User profile created for: {}", profile.owner);
        Ok(())
    }

    pub fn select_pet(ctx: Context<SelectPet>, pet_id: u8) -> Result<()> {
        require!(pet_id >= 1 && pet_id <= 10, ErrorCode::InvalidPetId);
        
        let profile = &mut ctx.accounts.user_profile;
        profile.pet_id = pet_id;
        
        msg!("User {} selected pet #{}", profile.owner, pet_id);
        Ok(())
    }

    pub fn send_friend_request(ctx: Context<SendFriendRequest>, user_a: Pubkey, user_b: Pubkey) -> Result<()> {
        let friendship = &mut ctx.accounts.friendship;
        let sender = ctx.accounts.user.key();
        let friend = ctx.accounts.friend.key();
        
        require!(user_a < user_b, ErrorCode::InvalidKeyOrder);
        require!(
            (sender == user_a && friend == user_b) || (sender == user_b && friend == user_a),
            ErrorCode::InvalidKeyOrder
        );
        
        friendship.user_a = user_a;
        friendship.user_b = user_b;
        friendship.requester = sender;
        friendship.status = FriendshipStatus::Pending;
        friendship.created_at = Clock::get()?.unix_timestamp;
        friendship.bump = ctx.bumps.friendship;
        
        msg!("Friend request sent from {} to {}", sender, friend);
        Ok(())
    }

    pub fn accept_friend_request(ctx: Context<AcceptFriendRequest>) -> Result<()> {
        let friendship = &mut ctx.accounts.friendship;
        
        require!(
            friendship.status == FriendshipStatus::Pending,
            ErrorCode::FriendshipAlreadyAccepted
        );
        
        friendship.status = FriendshipStatus::Accepted;
        
        let user_a_profile = &mut ctx.accounts.user_a_profile;
        if user_a_profile.owner == Pubkey::default() {
            user_a_profile.owner = friendship.user_a;
            user_a_profile.pet_id = 0;
            user_a_profile.friend_count = 0;
            user_a_profile.created_at = Clock::get()?.unix_timestamp;
            user_a_profile.bump = ctx.bumps.user_a_profile;
        }
        
        let user_b_profile = &mut ctx.accounts.user_b_profile;
        if user_b_profile.owner == Pubkey::default() {
            user_b_profile.owner = friendship.user_b;
            user_b_profile.pet_id = 0;
            user_b_profile.friend_count = 0;
            user_b_profile.created_at = Clock::get()?.unix_timestamp;
            user_b_profile.bump = ctx.bumps.user_b_profile;
        }
        
        user_a_profile.friend_count += 1;
        user_b_profile.friend_count += 1;
        
        msg!("Friendship accepted");
        Ok(())
    }

    pub fn remove_friend(ctx: Context<RemoveFriend>) -> Result<()> {
        ctx.accounts.user_a_profile.friend_count = ctx.accounts.user_a_profile.friend_count.saturating_sub(1);
        ctx.accounts.user_b_profile.friend_count = ctx.accounts.user_b_profile.friend_count.saturating_sub(1);
        
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
        let sender = ctx.accounts.sender.key();
        
        require!(
            sender == chat_room.user_a || sender == chat_room.user_b,
            ErrorCode::NotChatRoomMember
        );
        
        message.chat_room = chat_room.key();
        message.sender = sender;
        message.content = content;
        message.message_index = chat_room.message_count;
        message.timestamp = Clock::get()?.unix_timestamp;
        message.bump = ctx.bumps.message;
        
        chat_room.message_count += 1;
        chat_room.last_message_at = message.timestamp;
        
        Ok(())
    }

    pub fn delete_message(ctx: Context<DeleteMessage>) -> Result<()> {
        let message = &ctx.accounts.message;
        let sender = ctx.accounts.sender.key();
        
        require!(message.sender == sender, ErrorCode::Unauthorized);
        
        msg!("Message deleted");
        Ok(())
    }

    // ============================================================================
    // EXPENSE PROGRAM - 消费追踪
    // ============================================================================

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
        
        msg!("Expense stats initialized");
        Ok(())
    }

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
        
        record.owner = ctx.accounts.user.key();
        record.recipient = ctx.accounts.recipient.key();
        record.amount = amount;
        record.category = category.clone();
        record.description = description;
        record.tx_signature = tx_signature;
        record.record_index = stats.record_count;
        record.timestamp = Clock::get()?.unix_timestamp;
        record.bump = ctx.bumps.expense_record;
        
        stats.total_spent = stats.total_spent.checked_add(amount).unwrap();
        stats.record_count += 1;
        
        match category {
            ExpenseCategory::Dining => stats.dining_total = stats.dining_total.checked_add(amount).unwrap(),
            ExpenseCategory::Shopping => stats.shopping_total = stats.shopping_total.checked_add(amount).unwrap(),
            ExpenseCategory::Entertainment => stats.entertainment_total = stats.entertainment_total.checked_add(amount).unwrap(),
            ExpenseCategory::Travel => stats.travel_total = stats.travel_total.checked_add(amount).unwrap(),
            ExpenseCategory::Gifts => stats.gifts_total = stats.gifts_total.checked_add(amount).unwrap(),
            ExpenseCategory::Bills => stats.bills_total = stats.bills_total.checked_add(amount).unwrap(),
            ExpenseCategory::Other => stats.other_total = stats.other_total.checked_add(amount).unwrap(),
        }
        
        stats.last_updated = record.timestamp;
        
        msg!("Expense recorded");
        Ok(())
    }

    pub fn delete_expense_record(ctx: Context<DeleteExpenseRecord>) -> Result<()> {
        let record = &ctx.accounts.expense_record;
        let stats = &mut ctx.accounts.expense_stats;
        
        stats.total_spent = stats.total_spent.saturating_sub(record.amount);
        stats.record_count = stats.record_count.saturating_sub(1);
        
        match record.category {
            ExpenseCategory::Dining => stats.dining_total = stats.dining_total.saturating_sub(record.amount),
            ExpenseCategory::Shopping => stats.shopping_total = stats.shopping_total.saturating_sub(record.amount),
            ExpenseCategory::Entertainment => stats.entertainment_total = stats.entertainment_total.saturating_sub(record.amount),
            ExpenseCategory::Travel => stats.travel_total = stats.travel_total.saturating_sub(record.amount),
            ExpenseCategory::Gifts => stats.gifts_total = stats.gifts_total.saturating_sub(record.amount),
            ExpenseCategory::Bills => stats.bills_total = stats.bills_total.saturating_sub(record.amount),
            ExpenseCategory::Other => stats.other_total = stats.other_total.saturating_sub(record.amount),
        }
        
        stats.last_updated = Clock::get()?.unix_timestamp;
        
        msg!("Expense record deleted");
        Ok(())
    }

    // ============================================================================
    // FUNDING EVENTS - 福利社系统 (新功能)
    // ============================================================================

    /// 创建福利活动
    pub fn create_funding_event(
        ctx: Context<CreateFundingEvent>,
        title: String,
        amount: u64,
        deadline: i64,
        ipfs_hash: String,
        timestamp: i64,
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
        event.created_at = timestamp;
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
        
        msg!("Funding event created: {}", event.title);
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
        
        msg!("Application submitted");
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
        
        msg!("Funds disbursed: {} lamports", amount);
        Ok(())
    }

    /// 关闭活动
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
        
        msg!("Event closed");
        Ok(())
    }

    // ============================================================================
    // GROUP SPLIT - 分账系统 (新功能)
    // ============================================================================

    /// 创建分账群组
    pub fn create_group_split(
        ctx: Context<CreateGroupSplit>,
        title: String,
        total_amount: u64,
        member_count: u8,
        ipfs_hash: String,
        timestamp: i64,
    ) -> Result<()> {
        require!(title.len() > 0 && title.len() <= 64, ErrorCode::InvalidTitle);
        require!(total_amount > 0, ErrorCode::InvalidAmount);
        require!(member_count > 0 && member_count <= 20, ErrorCode::InvalidMemberCount);
        require!(ipfs_hash.len() > 0 && ipfs_hash.len() <= 64, ErrorCode::InvalidIPFSHash);
        
        let split = &mut ctx.accounts.group_split;
        let creator = ctx.accounts.creator.key();
        
        split.creator = creator;
        split.title = title;
        split.total_amount = total_amount;
        split.member_count = member_count;
        split.amount_per_person = total_amount / member_count as u64;
        split.ipfs_hash = ipfs_hash;
        split.created_at = timestamp;
        split.settled_count = 0;
        split.status = SplitStatus::Active;
        split.bump = ctx.bumps.group_split;
        
        msg!("Group split created: {}", split.title);
        Ok(())
    }

    /// 添加成员到分账群组
    pub fn add_split_member(
        ctx: Context<AddSplitMember>,
        member_pubkey: Pubkey,
    ) -> Result<()> {
        let split = &ctx.accounts.group_split;
        let member = &mut ctx.accounts.split_member;
        
        require!(
            ctx.accounts.creator.key() == split.creator,
            ErrorCode::Unauthorized
        );
        require!(
            split.status == SplitStatus::Active,
            ErrorCode::SplitNotActive
        );
        
        member.split = split.key();
        member.member = member_pubkey;
        member.amount_owed = split.amount_per_person;
        member.paid = false;
        member.paid_at = 0;
        member.bump = ctx.bumps.split_member;
        
        msg!("Member added to split: {}", member_pubkey);
        Ok(())
    }

    /// 标记成员已付款
    pub fn mark_split_paid(ctx: Context<MarkSplitPaid>) -> Result<()> {
        let split = &mut ctx.accounts.group_split;
        let member = &mut ctx.accounts.split_member;
        
        require!(
            split.status == SplitStatus::Active,
            ErrorCode::SplitNotActive
        );
        require!(
            !member.paid,
            ErrorCode::AlreadyPaid
        );
        require!(
            ctx.accounts.payer.key() == member.member || ctx.accounts.payer.key() == split.creator,
            ErrorCode::Unauthorized
        );
        
        member.paid = true;
        member.paid_at = Clock::get()?.unix_timestamp;
        split.settled_count += 1;
        
        // 如果所有人都付款了，自动关闭分账
        if split.settled_count >= split.member_count as u32 {
            split.status = SplitStatus::Settled;
        }
        
        msg!("Member marked as paid: {}", member.member);
        Ok(())
    }

    /// 关闭分账群组
    pub fn close_group_split(ctx: Context<CloseGroupSplit>) -> Result<()> {
        let split = &mut ctx.accounts.group_split;
        
        require!(
            ctx.accounts.creator.key() == split.creator,
            ErrorCode::Unauthorized
        );
        
        split.status = SplitStatus::Closed;
        
        msg!("Group split closed");
        Ok(())
    }
}

// ============================================================================
// ACCOUNT STRUCTURES - 账户结构
// ============================================================================

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub pet_id: u8,
    pub friend_count: u32,
    pub created_at: i64,
    pub bump: u8,
}

impl UserProfile {
    pub const LEN: usize = 8 + 32 + 1 + 4 + 8 + 1;
}

#[account]
pub struct Friendship {
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub requester: Pubkey,
    pub status: FriendshipStatus,
    pub created_at: i64,
    pub bump: u8,
}

impl Friendship {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum FriendshipStatus {
    Pending,
    Accepted,
}

#[account]
pub struct ChatRoom {
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub message_count: u64,
    pub last_message_at: i64,
    pub bump: u8,
}

impl ChatRoom {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct Message {
    pub chat_room: Pubkey,
    pub sender: Pubkey,
    pub content: String,
    pub message_index: u64,
    pub timestamp: i64,
    pub bump: u8,
}

impl Message {
    pub const LEN: usize = 8 + 32 + 32 + 504 + 8 + 8 + 1;
}

#[account]
pub struct ExpenseRecord {
    pub owner: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub category: ExpenseCategory,
    pub description: String,
    pub timestamp: i64,
    pub tx_signature: String,
    pub record_index: u64,
    pub bump: u8,
}

impl ExpenseRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 104 + 8 + 92 + 8 + 1;
}

#[account]
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
    pub last_updated: i64,
    pub bump: u8,
}

impl ExpenseStats {
    pub const LEN: usize = 8 + 32 + 8 + 8 + (8 * 7) + 8 + 1;
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

// 新增：福利活动账户
#[account]
pub struct FundingEvent {
    pub creator: Pubkey,
    pub title: String,
    pub total_amount: u64,
    pub remaining_amount: u64,
    pub deadline: i64,
    pub ipfs_hash: String,
    pub status: EventStatus,
    pub created_at: i64,
    pub application_count: u32,
    pub approved_count: u32,
    pub bump: u8,
}

impl FundingEvent {
    pub const LEN: usize = 8 + 32 + 68 + 8 + 8 + 8 + 68 + 1 + 8 + 4 + 4 + 1;
}

// 新增：申请账户
#[account]
pub struct Application {
    pub event: Pubkey,
    pub applicant: Pubkey,
    pub requested_amount: u64,
    pub approved_amount: u64,
    pub ipfs_hash: String,
    pub status: ApplicationStatus,
    pub applied_at: i64,
    pub bump: u8,
}

impl Application {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 68 + 1 + 8 + 1;
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

// 新增：分账群组账户
#[account]
pub struct GroupSplit {
    pub creator: Pubkey,
    pub title: String,
    pub total_amount: u64,
    pub member_count: u8,
    pub amount_per_person: u64,
    pub ipfs_hash: String,
    pub created_at: i64,
    pub settled_count: u32,
    pub status: SplitStatus,
    pub bump: u8,
}

impl GroupSplit {
    pub const LEN: usize = 8 + 32 + 68 + 8 + 1 + 8 + 68 + 8 + 4 + 1 + 1;
}

// 新增：分账成员账户
#[account]
pub struct SplitMember {
    pub split: Pubkey,
    pub member: Pubkey,
    pub amount_owed: u64,
    pub paid: bool,
    pub paid_at: i64,
    pub bump: u8,
}

impl SplitMember {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 8 + 1;
}

// 新增：分账状态
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SplitStatus {
    Active,
    Settled,
    Closed,
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

// --- Funding Events Contexts (新增) ---

#[derive(Accounts)]
#[instruction(title: String, amount: u64, deadline: i64, ipfs_hash: String, timestamp: i64)]
pub struct CreateFundingEvent<'info> {
    #[account(
        init,
        payer = creator,
        space = FundingEvent::LEN,
        seeds = [
            b"funding_event",
            creator.key().as_ref(),
            &timestamp.to_le_bytes()
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
        space = Application::LEN,
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

// --- Group Split Contexts (新增) ---

#[derive(Accounts)]
#[instruction(title: String, total_amount: u64, member_count: u8, ipfs_hash: String, timestamp: i64)]
pub struct CreateGroupSplit<'info> {
    #[account(
        init,
        payer = creator,
        space = GroupSplit::LEN,
        seeds = [
            b"group_split",
            creator.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub group_split: Account<'info, GroupSplit>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(member_pubkey: Pubkey)]
pub struct AddSplitMember<'info> {
    #[account(
        mut,
        seeds = [
            b"group_split",
            group_split.creator.as_ref(),
            &group_split.created_at.to_le_bytes()
        ],
        bump = group_split.bump
    )]
    pub group_split: Account<'info, GroupSplit>,
    
    #[account(
        init,
        payer = creator,
        space = SplitMember::LEN,
        seeds = [
            b"split_member",
            group_split.key().as_ref(),
            member_pubkey.as_ref()
        ],
        bump
    )]
    pub split_member: Account<'info, SplitMember>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarkSplitPaid<'info> {
    #[account(
        mut,
        seeds = [
            b"group_split",
            group_split.creator.as_ref(),
            &group_split.created_at.to_le_bytes()
        ],
        bump = group_split.bump
    )]
    pub group_split: Account<'info, GroupSplit>,
    
    #[account(
        mut,
        seeds = [
            b"split_member",
            group_split.key().as_ref(),
            split_member.member.as_ref()
        ],
        bump = split_member.bump
    )]
    pub split_member: Account<'info, SplitMember>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseGroupSplit<'info> {
    #[account(
        mut,
        seeds = [
            b"group_split",
            group_split.creator.as_ref(),
            &group_split.created_at.to_le_bytes()
        ],
        bump = group_split.bump
    )]
    pub group_split: Account<'info, GroupSplit>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
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
    
    // 新增：福利社错误
    #[msg("Invalid title")]
    InvalidTitle,
    
    #[msg("Invalid IPFS hash")]
    InvalidIPFSHash,
    
    #[msg("Event is not active")]
    EventNotActive,
    
    #[msg("Event has expired")]
    EventExpired,
    
    #[msg("Application already processed")]
    ApplicationAlreadyProcessed,
    
    #[msg("Insufficient funds in event")]
    InsufficientFunds,
    
    #[msg("Application not approved")]
    ApplicationNotApproved,
    
    // 新增：分账错误
    #[msg("Invalid member count (must be 1-20)")]
    InvalidMemberCount,
    
    #[msg("Split is not active")]
    SplitNotActive,
    
    #[msg("Member already paid")]
    AlreadyPaid,
}

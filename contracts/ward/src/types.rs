//! Data model for `ward`. Source of truth: ARCHITECTURE.md §4.
//! Mirrored in `packages/core/src/types.ts`: change both together.
//!
//! JSON conventions:
//! - Token amounts are `U128` (decimal strings).
//! - Timestamps and durations are `U64` nanoseconds (decimal strings).
//! - Ids are plain numbers. Hashes are `[u8; 32]`.
//! - NEAR amounts (`ops_balance`) are `NearToken` (yoctoNEAR string).

use near_sdk::json_types::{U128, U64};
use near_sdk::{near, AccountId, NearToken};

pub type TrustId = u64;
pub type RequestId = u64;
pub type BasisPoints = u16;
pub type CryptoHash = [u8; 32];

/// Social circle of a guardian. ≤2 guardians per circle, ≥2 circles per trust (invariant 1).
#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Circle {
    Maternal,
    Paternal,
    Community,
    Institution,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TrustStatus {
    Funding,
    DeathClaimed {
        claimed_at: U64,
        ends_at: U64,
    },
    Active,
    /// At least one child paid out; others pending.
    Graduating,
    /// Balance 0, all children done.
    Closed,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Guardian {
    pub account: AccountId,
    pub circle: Circle,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Child {
    /// Nickname only. Never a full name (invariant 10).
    pub label: String,
    /// Set only via a `SetChildAccount` request (2 circles, invariant 6).
    pub account: Option<AccountId>,
    pub birth_ts: U64,
    /// Fixed share of the balance at activation; all children sum to 10_000.
    pub share_bps: BasisPoints,
    pub paid_out: U128,
    pub tranches_paid: u8,
    pub alive: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PayeeKind {
    School,
    Clinic,
    Landlord,
    Other,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Payee {
    pub account: AccountId,
    pub label: String,
    pub kind: PayeeKind,
}

/// Trust rules. Fixed at `create_trust`, except where ARCHITECTURE §5 says otherwise. `time_scale` is immutable.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Rules {
    pub allowance_amount: U128,
    pub allowance_period: U64,
    /// Above this → LargeSpend rules (2 circles, one ≠ caregiver's).
    pub large_threshold: U128,
    /// Fixed at 3 (cross-circle by construction).
    pub death_quorum: u8,
    /// Demo 2 min; production ≥ 30 days.
    pub waiting_period: U64,
    /// Settlor can withdraw this much per allowance_period instantly.
    pub withdraw_free_cap: U128,
    /// Larger withdrawals wait this long (veto window).
    pub withdraw_delay: U64,
    /// Window in which a 2nd death-claim cancel needs a guardian vouch.
    pub cancel_window: U64,
    pub graduation_tranches: u8,
    pub max_open_requests: u8,
    pub flag_age_years: u8,
    pub majority_age_years: u8,
    /// If a child dies: siblings first (implicit), then these accounts.
    pub fallback: Vec<AccountId>,
    /// 1 = real time; >1 = demo mode. Immutable.
    pub time_scale: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Approval {
    pub account: AccountId,
    pub circle: Circle,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct DeathAttestation {
    pub guardian: AccountId,
    pub evidence_hash: CryptoHash,
    pub at: U64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct PendingWithdrawal {
    pub amount: U128,
    pub requested_at: U64,
    pub execute_after: U64,
    pub vetoes: Vec<Approval>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct CancelWindow {
    pub cancels: u8,
    pub window_end: U64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Trust {
    pub id: TrustId,
    pub label: String,
    pub settlor: AccountId,
    pub dao: Option<AccountId>,
    pub caregiver: AccountId,
    pub caregiver_circle: Circle,
    /// 3..=5, ≤2 per circle, ≥2 circles.
    pub guardians: Vec<Guardian>,
    pub children: Vec<Child>,
    pub payees: Vec<Payee>,
    pub rules: Rules,
    pub token: AccountId,
    pub balance: U128,
    /// NEAR for storage_deposit calls (payees, child accounts).
    pub ops_balance: NearToken,
    pub status: TrustStatus,
    /// Freeze flag; allowance still pays.
    pub paused: bool,
    pub death_attestations: Vec<DeathAttestation>,
    pub cancel_window: Option<CancelWindow>,
    pub pending_withdrawal: Option<PendingWithdrawal>,
    /// Free-cap accounting for settlor withdrawals.
    pub free_withdrawn: U128,
    pub free_period_start: U64,
    pub allowance_claimed_until: U64,
    pub activated_at: Option<U64>,
    /// Balance snapshot at activation; child shares are computed from it.
    pub activation_balance: Option<U128>,
    pub created_at: U64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum RequestKind {
    /// 1 guardian; paid to the registered payee only.
    PayeePayment { payee: AccountId, amount: U128 },
    /// 2 circles, at least one ≠ caregiver_circle.
    LargeSpend { to: AccountId, amount: U128 },
    /// 2 circles.
    SetChildAccount { child: u8, account: AccountId },
    /// 2 circles; share passes to siblings, then fallback.
    ChildDeceased { child: u8 },
    /// 2 circles.
    Unpause,
    /// 1 guardian: the settlor is alive (needed for a 2nd cancel inside the window).
    VouchCancel,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RequestStatus {
    Pending,
    Approved,
    Rejected,
    Executed,
}

/// Advisory AI receipt check (Could). Never approves or rejects (invariant 11).
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct AiReview {
    pub verdict: String,
    pub report_hash: CryptoHash,
    pub signing_address: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Request {
    pub id: RequestId,
    pub trust_id: TrustId,
    pub kind: RequestKind,
    pub created_by: AccountId,
    pub reason: String,
    pub receipt_hash: Option<CryptoHash>,
    pub ai_review: Option<AiReview>,
    pub approvals: Vec<Approval>,
    pub rejections: Vec<Approval>,
    /// Child ≥14 flagged it → needs 2-circle approvals regardless of kind.
    pub child_flagged: bool,
    pub status: RequestStatus,
    pub created_at: U64,
}

/// Inputs for `create_trust` (children without runtime fields).
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ChildInput {
    pub label: String,
    pub birth_ts: U64,
    pub share_bps: BasisPoints,
}

/// `ft_on_transfer` message, e.g. `{"deposit": 0}`.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FtMessage {
    Deposit(TrustId),
}

/// Returned by `get_child_status`.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ChildStatus {
    pub age_years: u8,
    pub can_flag: bool,
    pub can_graduate: bool,
    pub remaining_share: U128,
    pub tranches_left: u8,
}

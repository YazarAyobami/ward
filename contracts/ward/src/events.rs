//! NEP-297 events, standard `ward`, version `1.0.0` (ARCHITECTURE §8).

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{RequestId, TrustId};

pub const STANDARD: &str = "ward";
pub const VERSION: &str = "1.0.0";

#[near(serializers = [json])]
#[derive(Clone, Debug)]
#[serde(tag = "event", content = "data", rename_all = "snake_case")]
pub enum WardEvent {
    TrustCreated { trust_id: TrustId, settlor: AccountId },
    Deposit { trust_id: TrustId, amount: U128 },
    WithdrawalRequested { trust_id: TrustId, amount: U128 },
    WithdrawalVetoed { trust_id: TrustId },
    WithdrawalExecuted { trust_id: TrustId, amount: U128 },
    DeathAttested { trust_id: TrustId, guardian: AccountId },
    DeathClaimCancelled { trust_id: TrustId },
    TrustActivated { trust_id: TrustId, balance: U128 },
    AllowanceClaimed { trust_id: TrustId, amount: U128 },
    RequestCreated { trust_id: TrustId, request_id: RequestId },
    RequestApproved { request_id: RequestId, guardian: AccountId },
    RequestRejected { request_id: RequestId },
    RequestExecuted { request_id: RequestId },
    RequestFlagged { request_id: RequestId },
    TrustPaused { trust_id: TrustId, by: AccountId },
    TrustUnpaused { trust_id: TrustId },
    GuardianReplaced { trust_id: TrustId, old: AccountId, new: AccountId },
    CaregiverChanged { trust_id: TrustId, caregiver: AccountId },
    PayeeAdded { trust_id: TrustId, payee: AccountId },
    ChildAdded { trust_id: TrustId, child: u8 },
    ChildGraduationTranche { trust_id: TrustId, child: u8, amount: U128 },
    ChildDeceased { trust_id: TrustId, child: u8 },
}

pub fn emit(event: WardEvent) {
    let _ = event;
    todo!("W-2.2: EVENT_JSON NEP-297 log")
}

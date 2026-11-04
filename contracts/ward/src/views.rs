//! Views. (W-2.11)

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{ChildStatus, Request, Trust, TrustId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn get_trust(&self, trust_id: TrustId) -> Option<Trust> {
        let _ = trust_id;
        todo!("W-2.11")
    }
    pub fn get_trusts_for(&self, account: AccountId) -> Vec<Trust> {
        let _ = account;
        todo!("W-2.11")
    }
    pub fn get_requests(&self, trust_id: TrustId, from_index: Option<u64>, limit: Option<u64>) -> Vec<Request> {
        let _ = (trust_id, from_index, limit);
        todo!("W-2.11")
    }
    pub fn get_child_status(&self, trust_id: TrustId, child_idx: u8) -> ChildStatus {
        let _ = (trust_id, child_idx);
        todo!("W-2.11")
    }
    pub fn get_allowance_due(&self, trust_id: TrustId) -> U128 {
        let _ = trust_id;
        todo!("W-2.11")
    }
}

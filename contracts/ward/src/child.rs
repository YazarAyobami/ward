//! Child: flag (≥14) and graduation tranches (≥18). (W-3.8, W-3.9)

use near_sdk::near;

use crate::types::{RequestId, TrustId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn flag(&mut self, request_id: RequestId, child_idx: u8) {
        let _ = (request_id, child_idx);
        todo!("W-3.8")
    }

    /// One tranche per period, up to graduation_tranches; pausable between tranches.
    pub fn claim_graduation(&mut self, trust_id: TrustId, child_idx: u8) {
        let _ = (trust_id, child_idx);
        todo!("W-3.9")
    }
}

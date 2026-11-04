//! Guardian actions. (W-3.1, W-2.9, W-3.6, W-3.7)

use near_sdk::near;

use crate::types::{CryptoHash, RequestId, TrustId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// 3 attestations (cross-circle by construction) → DeathClaimed.
    pub fn attest_death(&mut self, trust_id: TrustId, evidence_hash: CryptoHash) {
        let _ = (trust_id, evidence_hash);
        todo!("W-3.1")
    }

    /// Executes the request when its rule is met.
    pub fn approve(&mut self, request_id: RequestId) {
        let _ = request_id;
        todo!("W-3.6")
    }

    pub fn reject(&mut self, request_id: RequestId) {
        let _ = request_id;
        todo!("W-3.6")
    }

    pub fn veto_withdrawal(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-2.9")
    }

    /// Any single guardian. Unpause goes through an `Unpause` request.
    pub fn pause(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-3.7")
    }
}

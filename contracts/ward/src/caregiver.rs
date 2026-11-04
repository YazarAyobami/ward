//! Caregiver: allowance and requests. (W-3.4, W-3.5)

use near_sdk::near;

use crate::types::{CryptoHash, RequestId, RequestKind, TrustId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Max 1 period of arrears; works while paused.
    pub fn claim_allowance(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-3.4")
    }

    /// Caregiver or guardian. Bounded by max_open_requests (E19).
    pub fn create_request(
        &mut self,
        trust_id: TrustId,
        kind: RequestKind,
        reason: String,
        receipt_hash: Option<CryptoHash>,
    ) -> RequestId {
        let _ = (trust_id, kind, reason, receipt_hash);
        todo!("W-3.5")
    }
}

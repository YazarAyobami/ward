//! DAO-only membership changes. The DAO never moves money (invariant 2). (W-4.1)

use near_sdk::{near, AccountId, Promise};

use crate::types::{Circle, Guardian, Payee, TrustId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Re-validates ≤2 per circle / ≥2 circles.
    pub fn council_replace_guardian(&mut self, trust_id: TrustId, old: AccountId, new: Guardian) {
        let _ = (trust_id, old, new);
        todo!("W-4.1")
    }

    pub fn council_set_caregiver(&mut self, trust_id: TrustId, account: AccountId, circle: Circle) {
        let _ = (trust_id, account, circle);
        todo!("W-4.1")
    }

    /// Calls storage_deposit from ops_balance.
    pub fn council_add_payee(&mut self, trust_id: TrustId, payee: Payee) -> Promise {
        let _ = (trust_id, payee);
        todo!("W-4.1")
    }
}

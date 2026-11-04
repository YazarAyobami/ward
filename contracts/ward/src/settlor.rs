//! Settlor: deposits, withdrawals (free cap / delay / veto), death-claim cancel. (W-2.8, W-2.9, W-3.2)

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::TrustId;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// ≤ free cap per period: paid now. Above: PendingWithdrawal (veto window). Blocked during DeathClaimed (E13).
    pub fn withdraw(&mut self, trust_id: TrustId, amount: U128) {
        let _ = (trust_id, amount);
        todo!("W-2.9")
    }

    /// Anyone, after the delay, if not vetoed by 2 circles.
    pub fn execute_withdrawal(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-2.9")
    }

    /// 1st cancel in window: immediate. 2nd: needs an approved VouchCancel (E14).
    pub fn cancel_death_claim(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-3.2")
    }
}

impl Contract {
    pub(crate) fn internal_deposit(&mut self, trust_id: TrustId, sender: AccountId, amount: U128) -> U128 {
        let _ = (trust_id, sender, amount);
        todo!("W-2.8")
    }
}

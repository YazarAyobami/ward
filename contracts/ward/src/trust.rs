//! Trust creation and lifecycle. (W-2.6, W-3.3)

use near_sdk::{near, AccountId};

use crate::types::{ChildInput, Circle, Guardian, Payee, Rules, TrustId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Validates guardians (≤2/circle, ≥2 circles), shares = 10000, caregiver ≠ guardian.
    /// Attached NEAR covers storage + ops_balance; calls storage_deposit for each payee.
    #[payable]
    #[allow(clippy::too_many_arguments)]
    pub fn create_trust(
        &mut self,
        label: String,
        caregiver: AccountId,
        caregiver_circle: Circle,
        guardians: Vec<Guardian>,
        children: Vec<ChildInput>,
        payees: Vec<Payee>,
        rules: Rules,
        token: AccountId,
    ) -> TrustId {
        let _ = (
            label,
            caregiver,
            caregiver_circle,
            guardians,
            children,
            payees,
            rules,
            token,
        );
        todo!("W-2.6")
    }

    /// Settlor, while Funding. New shares for all children must still sum to 10000.
    pub fn add_child(&mut self, trust_id: TrustId, child: ChildInput, new_shares_bps: Vec<u16>) {
        let _ = (trust_id, child, new_shares_bps);
        todo!("W-2.7")
    }

    /// Settlor, once, while Funding.
    pub fn set_dao(&mut self, trust_id: TrustId, dao: AccountId) {
        let _ = (trust_id, dao);
        todo!("W-2.7")
    }

    /// Anyone, after `ends_at` → Active; snapshots activation_balance.
    pub fn finalize_activation(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-3.3")
    }
}

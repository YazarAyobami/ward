//! Unit-test state builders (W-2.12). Test-only: never compiled into the wasm.

use near_sdk::json_types::{U128, U64};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{testing_env, AccountId, NearToken};

use crate::time::{NS_PER_DAY, NS_PER_MONTH};
use crate::types::{
    Approval, Child, ChildInput, Circle, Guardian, Payee, PayeeKind, Request, RequestKind,
    RequestStatus, Rules, Trust, TrustStatus,
};
use crate::Contract;

pub(crate) fn account(name: &str) -> AccountId {
    name.parse().expect("valid test account id")
}

/// Installs a mocked environment whose predecessor is `caller`.
pub(crate) fn set_caller(caller: AccountId) {
    let context = VMContextBuilder::new()
        .predecessor_account_id(caller)
        .build();
    testing_env!(context);
}

pub(crate) fn rules() -> Rules {
    Rules {
        allowance_amount: U128(150_000_000),
        allowance_period: U64(NS_PER_MONTH),
        large_threshold: U128(100_000_000),
        death_quorum: 3,
        waiting_period: U64(NS_PER_MONTH),
        withdraw_free_cap: U128(50_000_000),
        withdraw_delay: U64(NS_PER_DAY),
        cancel_window: U64(NS_PER_DAY),
        graduation_tranches: 3,
        max_open_requests: 5,
        flag_age_years: 14,
        majority_age_years: 18,
        fallback: vec![account("fallback.near")],
        time_scale: 1,
    }
}

pub(crate) fn guardian(account_id: &str, circle: Circle) -> Guardian {
    Guardian {
        account: account(account_id),
        circle,
    }
}

/// Four guardians, one per circle.
pub(crate) fn guardians() -> Vec<Guardian> {
    vec![
        guardian("aunt.near", Circle::Maternal),
        guardian("uncle.near", Circle::Paternal),
        guardian("teacher.near", Circle::Institution),
        guardian("pastor.near", Circle::Community),
    ]
}

pub(crate) fn child_input(label: &str, share_bps: u16) -> ChildInput {
    ChildInput {
        label: label.to_string(),
        birth_ts: U64(0),
        share_bps,
    }
}

pub(crate) fn child(label: &str, share_bps: u16, birth_ts: u64) -> Child {
    Child {
        label: label.to_string(),
        account: None,
        birth_ts: U64(birth_ts),
        share_bps,
        paid_out: U128(0),
        tranches_paid: 0,
        alive: true,
    }
}

pub(crate) fn trust(id: u64) -> Trust {
    Trust {
        id,
        label: "Ada & Tobi".to_string(),
        settlor: account("settlor.near"),
        dao: Some(account("dao.near")),
        caregiver: account("caregiver.near"),
        caregiver_circle: Circle::Paternal,
        guardians: guardians(),
        children: vec![child("Ada", 5_000, 0), child("Tobi", 5_000, 0)],
        payees: vec![Payee {
            account: account("school.near"),
            label: "School".to_string(),
            kind: PayeeKind::School,
        }],
        rules: rules(),
        token: account("tusdc.near"),
        balance: U128(2_000_000_000),
        ops_balance: NearToken::from_millinear(100),
        status: TrustStatus::Funding,
        paused: false,
        death_attestations: Vec::new(),
        cancel_window: None,
        pending_withdrawal: None,
        free_withdrawn: U128(0),
        free_period_start: U64(0),
        allowance_claimed_until: U64(0),
        activated_at: None,
        activation_balance: None,
        created_at: U64(0),
    }
}

pub(crate) fn approval(account_id: &str, circle: Circle) -> Approval {
    Approval {
        account: account(account_id),
        circle,
    }
}

pub(crate) fn request(trust_id: u64, kind: RequestKind) -> Request {
    Request {
        id: 0,
        trust_id,
        kind,
        created_by: account("caregiver.near"),
        reason: String::new(),
        receipt_hash: None,
        ai_review: None,
        approvals: Vec::new(),
        rejections: Vec::new(),
        child_flagged: false,
        status: RequestStatus::Pending,
        created_at: U64(0),
    }
}

pub(crate) fn insert_trust(contract: &mut Contract, trust: Trust) {
    contract.trusts.insert(trust.id, trust);
}

pub(crate) fn insert_request(contract: &mut Contract, request: Request) {
    contract.requests.insert(request.id, request);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builders_produce_a_valid_trust() {
        set_caller(account("settlor.near"));
        let mut contract = Contract::new(None);

        let trust = trust(3);
        let request = request(3, RequestKind::Unpause);

        insert_trust(&mut contract, trust.clone());
        insert_request(&mut contract, request.clone());

        assert_eq!(contract.trusts.get(&3), Some(&trust));
        assert_eq!(contract.requests.get(&0), Some(&request));
    }

    #[test]
    fn builder_guardians_satisfy_the_circle_rules() {
        assert_eq!(
            crate::rules::validate_guardians(&guardians(), &account("caregiver.near")),
            Ok(())
        );
    }
}

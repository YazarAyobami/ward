//! Views. (W-2.11)

use near_sdk::json_types::U128;
use near_sdk::{env, near, AccountId};

use crate::errors;
use crate::rules;
use crate::time;
use crate::types::{ChildStatus, Request, Trust, TrustId, TrustStatus};
use crate::{Contract, ContractExt};

const DEFAULT_LIMIT: usize = 50;

#[near]
impl Contract {
    pub fn get_trust(&self, trust_id: TrustId) -> Option<Trust> {
        self.trusts.get(&trust_id).cloned()
    }

    pub fn get_trusts_for(&self, account: AccountId) -> Vec<Trust> {
        let ids = self.by_account.get(&account).cloned().unwrap_or_default();
        ids.iter()
            .filter_map(|id| self.trusts.get(id))
            .cloned()
            .collect()
    }

    /// Paginated by insertion order; `from_index` and `limit` are optional.
    pub fn get_requests(
        &self,
        trust_id: TrustId,
        from_index: Option<u64>,
        limit: Option<u64>,
    ) -> Vec<Request> {
        let from = usize::try_from(from_index.unwrap_or(0)).unwrap_or(usize::MAX);
        let limit = usize::try_from(limit.unwrap_or(DEFAULT_LIMIT as u64)).unwrap_or(DEFAULT_LIMIT);
        self.requests
            .iter()
            .filter(|(_, request)| request.trust_id == trust_id)
            .skip(from)
            .take(limit)
            .map(|(_, request)| request.clone())
            .collect()
    }

    pub fn get_child_status(&self, trust_id: TrustId, child_idx: u8) -> ChildStatus {
        let trust = self.trust_or_panic(trust_id);
        let index = usize::from(child_idx);
        let Some(child) = trust.children.get(index) else {
            env::panic_str(errors::E36_CHILD_NOT_FOUND);
        };

        let now = env::block_timestamp();
        let age_years = time::age_years(child.birth_ts.0, now, trust.rules.time_scale);
        let payouts_open = matches!(trust.status, TrustStatus::Active | TrustStatus::Graduating);
        let unlocked = trust.activated_at.map_or(0, |activated_at| {
            time::periods_elapsed(
                activated_at.0,
                now,
                trust.rules.allowance_period.0,
                trust.rules.time_scale,
            )
        });

        ChildStatus {
            age_years,
            can_flag: child.account.is_some() && age_years >= trust.rules.flag_age_years,
            can_graduate: child.account.is_some()
                && child.alive
                && payouts_open
                && !trust.paused
                && age_years >= trust.rules.majority_age_years
                && child.tranches_paid < trust.rules.graduation_tranches
                && unlocked > u64::from(child.tranches_paid),
            remaining_share: U128(rules::remaining_share(&trust, index)),
            tranches_left: trust
                .rules
                .graduation_tranches
                .saturating_sub(child.tranches_paid),
        }
    }

    pub fn get_allowance_due(&self, trust_id: TrustId) -> U128 {
        let trust = self.trust_or_panic(trust_id);
        U128(rules::allowance_due(&trust, env::block_timestamp()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{
        account, insert_request, insert_trust, insert_trust_for, request, set_caller, trust,
    };
    use crate::time::{NS_PER_MONTH, NS_PER_YEAR};
    use crate::types::RequestKind;
    use near_sdk::json_types::U64;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn install_context(now_ns: u64) {
        testing_env!(VMContextBuilder::new().block_timestamp(now_ns).build());
    }

    fn contract_with_trusts() -> Contract {
        set_caller(account("settlor.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));
        insert_trust(&mut contract, trust(1));
        insert_trust_for(&mut contract, account("settlor.near"), 0);
        insert_trust_for(&mut contract, account("settlor.near"), 1);
        insert_trust_for(&mut contract, account("caregiver.near"), 1);
        contract
    }

    #[test]
    fn get_trust_returns_none_for_missing_id() {
        let contract = contract_with_trusts();
        assert_eq!(contract.get_trust(0), Some(trust(0)));
        assert_eq!(contract.get_trust(9), None);
    }

    #[test]
    fn get_trusts_for_reads_the_account_index() {
        let contract = contract_with_trusts();
        assert_eq!(
            contract.get_trusts_for(account("settlor.near")),
            vec![trust(0), trust(1)]
        );
        assert_eq!(
            contract.get_trusts_for(account("caregiver.near")),
            vec![trust(1)]
        );
        assert!(contract.get_trusts_for(account("stranger.near")).is_empty());
    }

    #[test]
    fn get_requests_filters_by_trust_and_paginates() {
        let mut contract = contract_with_trusts();
        for id in 0..5 {
            let mut req = request(0, RequestKind::Unpause);
            req.id = id;
            insert_request(&mut contract, req);
        }
        for id in 5..7 {
            let mut req = request(1, RequestKind::Unpause);
            req.id = id;
            insert_request(&mut contract, req);
        }

        let first_page = contract.get_requests(0, None, Some(2));
        assert_eq!(
            first_page.iter().map(|r| r.id).collect::<Vec<_>>(),
            vec![0, 1]
        );

        let second_page = contract.get_requests(0, Some(3), Some(2));
        assert_eq!(
            second_page.iter().map(|r| r.id).collect::<Vec<_>>(),
            vec![3, 4]
        );

        let other_trust = contract.get_requests(1, None, None);
        assert_eq!(
            other_trust.iter().map(|r| r.id).collect::<Vec<_>>(),
            vec![5, 6]
        );
    }

    #[test]
    fn child_status_reports_age() {
        install_context(18 * NS_PER_YEAR);
        let mut contract = Contract::new(None);
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        trust.activated_at = Some(U64(0));
        trust.children[0].account = Some(account("ada.near"));
        insert_trust(&mut contract, trust);

        let status = contract.get_child_status(0, 0);

        assert_eq!(status.age_years, 18);
        assert!(status.can_flag);
        assert!(status.can_graduate);
        assert_eq!(status.remaining_share, U128(1_000_000_000));
        assert_eq!(status.tranches_left, 3);
    }

    #[test]
    fn child_status_blocks_actions_without_an_account() {
        install_context(18 * NS_PER_YEAR);
        let mut contract = Contract::new(None);
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        insert_trust(&mut contract, trust);

        let status = contract.get_child_status(0, 0);

        assert!(!status.can_flag);
        assert!(!status.can_graduate);
    }

    #[test]
    fn child_status_counts_tranches_left() {
        install_context(18 * NS_PER_YEAR);
        let mut contract = Contract::new(None);
        let mut trust = trust(0);
        trust.status = TrustStatus::Graduating;
        trust.activated_at = Some(U64(0));
        trust.children[0].account = Some(account("ada.near"));
        trust.children[0].tranches_paid = 2;
        insert_trust(&mut contract, trust);

        let status = contract.get_child_status(0, 0);

        assert_eq!(status.tranches_left, 1);
        assert!(status.can_graduate);
    }

    #[test]
    #[should_panic(expected = "E36_CHILD_NOT_FOUND")]
    fn child_status_rejects_unknown_index() {
        install_context(0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));
        contract.get_child_status(0, 9);
    }

    #[test]
    fn allowance_due_view() {
        install_context(NS_PER_MONTH);
        let mut contract = Contract::new(None);
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        trust.activated_at = Some(U64(0));
        insert_trust(&mut contract, trust);

        assert_eq!(contract.get_allowance_due(0), U128(150_000_000));
    }

    #[test]
    fn allowance_due_view_is_zero_before_activation() {
        install_context(NS_PER_MONTH);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        assert_eq!(contract.get_allowance_due(0), U128(0));
    }
}

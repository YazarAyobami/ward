//! Role guards, called first in every mutating method. (W-2.5)

use near_sdk::{env, require, AccountId};

use crate::errors;
use crate::types::{Circle, Trust};

pub fn assert_settlor(trust: &Trust) {
    require!(
        env::predecessor_account_id() == trust.settlor,
        errors::E02_NOT_SETTLOR
    );
}

/// Returns the calling guardian's account and circle.
pub fn assert_guardian(trust: &Trust) -> (AccountId, Circle) {
    let caller = env::predecessor_account_id();
    match trust
        .guardians
        .iter()
        .find(|guardian| guardian.account == caller)
    {
        Some(guardian) => (caller, guardian.circle),
        None => env::panic_str(errors::E03_NOT_GUARDIAN),
    }
}

pub fn assert_caregiver(trust: &Trust) {
    require!(
        env::predecessor_account_id() == trust.caregiver,
        errors::E04_NOT_CAREGIVER
    );
}

pub fn assert_child(trust: &Trust, child_idx: u8) {
    let caller = env::predecessor_account_id();
    let is_child = trust
        .children
        .get(usize::from(child_idx))
        .and_then(|child| child.account.as_ref())
        .is_some_and(|account| account == &caller);
    require!(is_child, errors::E05_NOT_CHILD);
}

pub fn assert_dao(trust: &Trust) {
    let caller = env::predecessor_account_id();
    require!(trust.dao.as_ref() == Some(&caller), errors::E06_NOT_DAO);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, set_caller, trust};

    #[test]
    fn assert_settlor_accepts() {
        set_caller(account("settlor.near"));
        assert_settlor(&trust(0));
    }

    #[test]
    #[should_panic(expected = "E02_NOT_SETTLOR")]
    fn assert_settlor_rejects() {
        set_caller(account("stranger.near"));
        assert_settlor(&trust(0));
    }

    #[test]
    fn assert_guardian_returns_circle() {
        set_caller(account("pastor.near"));
        assert_eq!(
            assert_guardian(&trust(0)),
            (account("pastor.near"), Circle::Community)
        );
    }

    #[test]
    #[should_panic(expected = "E03_NOT_GUARDIAN")]
    fn assert_guardian_rejects_caregiver() {
        set_caller(account("caregiver.near"));
        assert_guardian(&trust(0));
    }

    #[test]
    fn assert_caregiver_accepts() {
        set_caller(account("caregiver.near"));
        assert_caregiver(&trust(0));
    }

    #[test]
    #[should_panic(expected = "E04_NOT_CAREGIVER")]
    fn assert_caregiver_rejects() {
        set_caller(account("stranger.near"));
        assert_caregiver(&trust(0));
    }

    #[test]
    fn assert_child_accepts_registered_child() {
        let mut trust = trust(0);
        trust.children[1].account = Some(account("tobi.near"));
        set_caller(account("tobi.near"));
        assert_child(&trust, 1);
    }

    #[test]
    #[should_panic(expected = "E05_NOT_CHILD")]
    fn assert_child_rejects_unset_account() {
        set_caller(account("tobi.near"));
        assert_child(&trust(0), 1);
    }

    #[test]
    #[should_panic(expected = "E05_NOT_CHILD")]
    fn assert_child_rejects_out_of_range_index() {
        set_caller(account("tobi.near"));
        assert_child(&trust(0), 9);
    }

    #[test]
    fn assert_dao_accepts() {
        set_caller(account("dao.near"));
        assert_dao(&trust(0));
    }

    #[test]
    #[should_panic(expected = "E06_NOT_DAO")]
    fn assert_dao_rejects_when_no_dao_is_set() {
        let mut trust = trust(0);
        trust.dao = None;
        set_caller(account("dao.near"));
        assert_dao(&trust);
    }
}

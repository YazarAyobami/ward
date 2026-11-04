//! PURE rule engine: no `env::` calls. (W-2.4)
//! Mirrored in `packages/core/src/rules.ts` for UI previews: change both together.

use crate::types::{Approval, Circle, ChildInput, Guardian, Request, RequestKind, Trust};

/// 3..=5 guardians, ≤2 per circle, ≥2 circles, caregiver not a guardian (E07–E09, E11).
pub fn validate_guardians(guardians: &[Guardian], caregiver: &near_sdk::AccountId) -> Result<(), &'static str> {
    let _ = (guardians, caregiver);
    todo!("W-2.4")
}

pub fn validate_shares(children: &[ChildInput]) -> Result<(), &'static str> {
    let _ = children;
    todo!("W-2.4")
}

/// Number of distinct circles among approvals.
pub fn distinct_circles(approvals: &[Approval]) -> usize {
    let _ = approvals;
    todo!("W-2.4")
}

/// Is the request's approval rule met (ARCHITECTURE §6)?
pub fn is_satisfied(trust: &Trust, request: &Request) -> bool {
    let _ = (trust, request);
    todo!("W-2.4")
}

/// Rejected once 2 rejections from different circles.
pub fn is_rejected(request: &Request) -> bool {
    let _ = request;
    todo!("W-2.4")
}

pub fn requires_two_circles(kind: &RequestKind, child_flagged: bool) -> bool {
    let _ = (kind, child_flagged);
    todo!("W-2.4")
}

/// Allowance due now (max 1 period of arrears, never above balance).
pub fn allowance_due(trust: &Trust, now_ns: u64) -> u128 {
    let _ = (trust, now_ns);
    todo!("W-2.4")
}

/// Remaining share for a child, scaled by spends since activation.
pub fn remaining_share(trust: &Trust, child_idx: usize) -> u128 {
    let _ = (trust, child_idx);
    todo!("W-2.4")
}

pub fn circle_of(trust: &Trust, account: &near_sdk::AccountId) -> Option<Circle> {
    let _ = (trust, account);
    todo!("W-2.4")
}

#[cfg(test)]
mod tests {
    // W-2.4: one test per rule, e.g. rejects_three_guardians_in_one_circle,
    // large_spend_needs_circle_other_than_caregivers, allowance_never_exceeds_balance.
}

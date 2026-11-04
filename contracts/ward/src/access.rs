//! Role guards, called first in every mutating method. (W-2.5)

use near_sdk::AccountId;

use crate::types::{Circle, Trust};

pub fn assert_settlor(trust: &Trust) {
    let _ = trust;
    todo!("W-2.5")
}
pub fn assert_guardian(trust: &Trust) -> (AccountId, Circle) {
    let _ = trust;
    todo!("W-2.5")
}
pub fn assert_caregiver(trust: &Trust) {
    let _ = trust;
    todo!("W-2.5")
}
pub fn assert_child(trust: &Trust, child_idx: u8) {
    let _ = (trust, child_idx);
    todo!("W-2.5")
}
pub fn assert_dao(trust: &Trust) {
    let _ = trust;
    todo!("W-2.5")
}

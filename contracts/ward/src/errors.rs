//! Every error code + message. Format: "E##_CODE: human message".

pub const E01_TRUST_NOT_FOUND: &str = "E01_TRUST_NOT_FOUND: trust does not exist";
pub const E02_NOT_SETTLOR: &str = "E02_NOT_SETTLOR: only the settlor can call this";
pub const E03_NOT_GUARDIAN: &str = "E03_NOT_GUARDIAN: caller is not a guardian of this trust";
pub const E04_NOT_CAREGIVER: &str = "E04_NOT_CAREGIVER: caller is not the caregiver";
pub const E05_NOT_CHILD: &str = "E05_NOT_CHILD: caller is not this child's registered account";
pub const E06_NOT_DAO: &str = "E06_NOT_DAO: only the trust DAO can call this";
pub const E07_GUARDIAN_COUNT: &str = "E07_GUARDIAN_COUNT: a trust needs 3 to 5 guardians";
pub const E08_CIRCLE_LIMIT: &str = "E08_CIRCLE_LIMIT: at most 2 guardians per circle";
pub const E09_CIRCLE_DIVERSITY: &str =
    "E09_CIRCLE_DIVERSITY: guardians must span at least 2 circles";
pub const E10_SHARES_SUM: &str = "E10_SHARES_SUM: child shares must sum to 10000 bps";
pub const E11_CAREGIVER_IS_GUARDIAN: &str =
    "E11_CAREGIVER_IS_GUARDIAN: the caregiver cannot be a guardian";
pub const E12_INVALID_STATUS: &str =
    "E12_INVALID_STATUS: trust is not in a valid status for this action";
pub const E13_CLAIM_PENDING: &str = "E13_CLAIM_PENDING: not allowed while a death claim is pending";
pub const E14_VOUCH_REQUIRED: &str =
    "E14_VOUCH_REQUIRED: a second cancel in the window needs a guardian vouch";
pub const E15_WITHDRAW_DELAY: &str = "E15_WITHDRAW_DELAY: withdrawal delay has not passed";
pub const E16_WITHDRAW_VETOED: &str = "E16_WITHDRAW_VETOED: withdrawal was vetoed";
pub const E17_ALREADY_ATTESTED: &str = "E17_ALREADY_ATTESTED: guardian already attested";
pub const E18_PAUSED: &str = "E18_PAUSED: trust is paused";
pub const E19_TOO_MANY_REQUESTS: &str = "E19_TOO_MANY_REQUESTS: too many open requests";
pub const E20_NOT_A_PAYEE: &str = "E20_NOT_A_PAYEE: account is not a registered payee";
pub const E21_ALREADY_VOTED: &str = "E21_ALREADY_VOTED: guardian already voted on this request";
pub const E22_TOO_YOUNG: &str = "E22_TOO_YOUNG: child has not reached the required age";
pub const E23_INSUFFICIENT_BALANCE: &str = "E23_INSUFFICIENT_BALANCE: trust balance is too low";
pub const E24_WRONG_TOKEN: &str = "E24_WRONG_TOKEN: token is not this trust's token";
pub const E25_TIME_SCALE_IMMUTABLE: &str = "E25_TIME_SCALE_IMMUTABLE: time_scale cannot be changed";
pub const E26_REQUEST_NOT_FOUND: &str = "E26_REQUEST_NOT_FOUND: request does not exist";
pub const E27_NOT_AI_REVIEWER: &str = "E27_NOT_AI_REVIEWER: caller is not the AI reviewer";
pub const E28_INVALID_MESSAGE: &str = "E28_INVALID_MESSAGE: ft_on_transfer message is invalid";
pub const E29_INSUFFICIENT_DEPOSIT: &str =
    "E29_INSUFFICIENT_DEPOSIT: attached deposit does not cover storage and ops balance";
pub const E30_NOTHING_DUE: &str = "E30_NOTHING_DUE: no allowance is due yet";
pub const E31_INVALID_RULES: &str = "E31_INVALID_RULES: trust rules are invalid";
pub const E32_INVALID_AMOUNT: &str = "E32_INVALID_AMOUNT: amount must be greater than zero";
pub const E33_WITHDRAWAL_PENDING: &str =
    "E33_WITHDRAWAL_PENDING: another withdrawal is already pending";
pub const E34_NO_PENDING_WITHDRAWAL: &str = "E34_NO_PENDING_WITHDRAWAL: no withdrawal is pending";
pub const E35_DUPLICATE_GUARDIAN: &str =
    "E35_DUPLICATE_GUARDIAN: each guardian must be a distinct account";
pub const E36_CHILD_NOT_FOUND: &str = "E36_CHILD_NOT_FOUND: child index does not exist";

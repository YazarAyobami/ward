//! NEP-297 events, standard `ward`, version `1.0.0` (ARCHITECTURE §8).

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{RequestId, TrustId};

pub const STANDARD: &str = "ward";
pub const VERSION: &str = "1.0.0";

#[near(serializers = [json])]
#[derive(Clone, Debug)]
#[serde(tag = "event", content = "data", rename_all = "snake_case")]
pub enum WardEvent {
    TrustCreated {
        trust_id: TrustId,
        settlor: AccountId,
    },
    Deposit {
        trust_id: TrustId,
        amount: U128,
    },
    WithdrawalRequested {
        trust_id: TrustId,
        amount: U128,
    },
    WithdrawalVetoed {
        trust_id: TrustId,
    },
    WithdrawalExecuted {
        trust_id: TrustId,
        amount: U128,
    },
    DeathAttested {
        trust_id: TrustId,
        guardian: AccountId,
    },
    DeathClaimCancelled {
        trust_id: TrustId,
    },
    TrustActivated {
        trust_id: TrustId,
        balance: U128,
    },
    AllowanceClaimed {
        trust_id: TrustId,
        amount: U128,
    },
    RequestCreated {
        trust_id: TrustId,
        request_id: RequestId,
    },
    RequestApproved {
        request_id: RequestId,
        guardian: AccountId,
    },
    RequestRejected {
        request_id: RequestId,
    },
    RequestExecuted {
        request_id: RequestId,
    },
    RequestFlagged {
        request_id: RequestId,
    },
    TrustPaused {
        trust_id: TrustId,
        by: AccountId,
    },
    TrustUnpaused {
        trust_id: TrustId,
    },
    GuardianReplaced {
        trust_id: TrustId,
        old: AccountId,
        new: AccountId,
    },
    CaregiverChanged {
        trust_id: TrustId,
        caregiver: AccountId,
    },
    PayeeAdded {
        trust_id: TrustId,
        payee: AccountId,
    },
    ChildAdded {
        trust_id: TrustId,
        child: u8,
    },
    ChildGraduationTranche {
        trust_id: TrustId,
        child: u8,
        amount: U128,
    },
    ChildDeceased {
        trust_id: TrustId,
        child: u8,
    },
}

/// Logs one NEP-297 event: `EVENT_JSON:{"standard":"ward","version":"1.0.0",...}`.
pub fn emit(event: WardEvent) {
    near_sdk::env::log_str(&event_json(&event));
}

/// Builds the NEP-297 payload. Split out of `emit` so it can be asserted in a unit test.
pub(crate) fn event_json(event: &WardEvent) -> String {
    let tagged = near_sdk::serde_json::to_value(event).expect("WardEvent always serializes");
    let name = tagged
        .get("event")
        .and_then(|v| v.as_str())
        .expect("tagged event name");
    let data = tagged.get("data").cloned().expect("tagged event data");
    let payload = near_sdk::serde_json::json!({
        "standard": STANDARD,
        "version": VERSION,
        "event": name,
        "data": [data],
    });
    format!("EVENT_JSON:{payload}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::get_logs;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;
    use near_sdk::AccountId;
    use serde_json::Value;

    fn parse(payload: &str) -> Value {
        let json = payload.strip_prefix("EVENT_JSON:").expect("NEP-297 prefix");
        serde_json::from_str(json).expect("valid JSON")
    }

    #[test]
    fn emit_writes_nep297_json() {
        testing_env!(VMContextBuilder::new().build());
        let settlor: AccountId = "settlor.near".parse().unwrap();

        emit(WardEvent::TrustCreated {
            trust_id: 7,
            settlor: settlor.clone(),
        });

        let logs = get_logs();
        assert_eq!(logs.len(), 1);
        let payload = parse(&logs[0]);
        assert_eq!(payload["standard"], STANDARD);
        assert_eq!(payload["version"], VERSION);
        assert_eq!(payload["event"], "trust_created");
        assert_eq!(payload["data"][0]["trust_id"], 7);
        assert_eq!(payload["data"][0]["settlor"], settlor.as_str());
        assert!(payload["data"].is_array());
    }

    #[test]
    fn unit_events_serialize_data_as_array() {
        let payload = parse(&event_json(&WardEvent::TrustUnpaused { trust_id: 1 }));
        assert_eq!(payload["event"], "trust_unpaused");
        assert_eq!(
            payload["data"],
            near_sdk::serde_json::json!([{ "trust_id": 1 }])
        );
    }
}

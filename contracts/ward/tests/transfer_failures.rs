//! Integration tests — ROADMAP W-5.8. Names state the rule they check.
mod common;

use near_workspaces::types::NearToken;
use near_workspaces::Account;
use serde_json::json;

async fn create_test_trust(
    env: &common::Env,
    settlor: &Account,
    caregiver: &Account,
    guardians: &[(&Account, &str)],
    payees: &[(&Account, &str)],
    rules: serde_json::Value,
    deposit_amount: u128,
) -> u64 {
    let guardian_objs: Vec<_> = guardians
        .iter()
        .map(|(g, circle)| json!({ "account": g.id(), "circle": circle }))
        .collect();

    let payee_objs: Vec<_> = payees
        .iter()
        .map(|(p, kind)| json!({ "account": p.id(), "label": "Test Payee", "kind": kind }))
        .collect();

    let res = settlor
        .call(env.ward.id(), "create_trust")
        .args_json(json!({
            "label": "Family Trust",
            "caregiver": caregiver.id(),
            "caregiver_circle": "Paternal",
            "guardians": guardian_objs,
            "children": [
                { "label": "Ada", "birth_ts": "0", "share_bps": 5000 },
                { "label": "Tobi", "birth_ts": "0", "share_bps": 5000 },
            ],
            "payees": payee_objs,
            "rules": rules,
            "token": env.token.id(),
        }))
        .deposit(NearToken::from_near(1))
        .transact()
        .await
        .expect("create_trust")
        .into_result()
        .expect("trust id");

    let trust_id: u64 = res.json().expect("trust_id");

    if deposit_amount > 0 {
        env.register_storage(settlor).await;
        env.mint(settlor, deposit_amount).await;

        let deposit_res = settlor
            .call(env.token.id(), "ft_transfer_call")
            .args_json(json!({
                "receiver_id": env.ward.id(),
                "amount": deposit_amount.to_string(),
                "msg": json!({ "deposit": trust_id }).to_string(),
            }))
            .deposit(NearToken::from_yoctonear(1))
            .max_gas()
            .transact()
            .await
            .expect("ft_transfer_call");
        assert!(deposit_res.is_success());
    }

    trust_id
}

async fn setup_active_trust(
    env: &common::Env,
    settlor: &Account,
    caregiver: &Account,
    guardians: &[(&Account, &str)],
    rules: serde_json::Value,
    deposit_amount: u128,
) -> u64 {
    let trust_id = create_test_trust(
        env,
        settlor,
        caregiver,
        guardians,
        &[],
        rules,
        deposit_amount,
    )
    .await;

    let dummy_hash = vec![1u8; 32];
    for (g, _) in &guardians[..3] {
        let _ = g
            .call(env.ward.id(), "attest_death")
            .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
            .transact()
            .await
            .expect("attest");
    }

    let fin = settlor
        .call(env.ward.id(), "finalize_activation")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("finalize_activation");
    assert!(fin.is_success(), "finalize failed: {:?}", fin.failures());

    trust_id
}

#[tokio::test]
async fn failed_payout_rolls_back() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    // unregistered receiver has NO storage_deposit on mock token
    let unregistered = env.user("unreg").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["large_threshold"] = json!((100 * common::TUSDC).to_string());

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        rules,
        500 * common::TUSDC,
    )
    .await;

    // 1. LargeSpend payout rollback test:
    // Caregiver creates LargeSpend to unregistered account
    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": {
                "LargeSpend": {
                    "to": unregistered.id(),
                    "amount": (150 * common::TUSDC).to_string(),
                }
            },
            "reason": "emergency medical equipment",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create req")
        .into_result()
        .expect("req id");
    let req_id: u64 = req_res.json().expect("u64");

    // 1st approval from Maternal guardian
    let a1 = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve 1");
    assert!(a1.is_success());

    // 2nd approval from Paternal guardian triggers execute_request -> ft_transfer to unregistered.
    // Since unregistered is not registered with mock token, ft_transfer fails, triggering on_payout.
    let a2 = g2
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve 2");
    assert!(a2.is_success());

    // Verify state was restored:
    // Balance is still 500 tUSDC (the 150 was refunded)
    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["balance"], (500 * common::TUSDC).to_string());

    // Request status was reverted from Executed back to Pending so it can be retried!
    let reqs: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(reqs[0]["status"], "Pending");
}

#[tokio::test]
async fn time_scale_cannot_change() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let new_g = env.user("newg").await;
    let dao = env.user("dao").await;

    // 1. time_scale == 0 is strictly rejected at trust creation
    let mut bad_rules = env.default_rules();
    bad_rules["time_scale"] = json!(0);

    let guardian_objs = vec![
        json!({ "account": g1.id(), "circle": "Maternal" }),
        json!({ "account": g2.id(), "circle": "Paternal" }),
        json!({ "account": g3.id(), "circle": "Community" }),
    ];

    let bad_res = settlor
        .call(env.ward.id(), "create_trust")
        .args_json(json!({
            "label": "Invalid Scale Trust",
            "caregiver": caregiver.id(),
            "caregiver_circle": "Paternal",
            "guardians": guardian_objs,
            "children": [
                { "label": "Ada", "birth_ts": "0", "share_bps": 5000 },
                { "label": "Tobi", "birth_ts": "0", "share_bps": 5000 },
            ],
            "payees": [],
            "rules": bad_rules,
            "token": env.token.id(),
        }))
        .deposit(NearToken::from_near(1))
        .transact()
        .await
        .expect("create bad rules");
    assert!(bad_res.is_failure());
    let err = format!("{:?}", bad_res.failures());
    assert!(err.contains("E31_INVALID_RULES"));

    // 2. Create valid trust with time_scale = 42
    let mut good_rules = env.default_rules();
    good_rules["time_scale"] = json!(42);
    good_rules["waiting_period"] = json!("0");

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &[],
        good_rules,
        100 * common::TUSDC,
    )
    .await;

    // Set DAO
    let _ = settlor
        .call(env.ward.id(), "set_dao")
        .args_json(json!({ "trust_id": trust_id, "dao": dao.id() }))
        .transact()
        .await
        .unwrap();

    // Verify initial time_scale is 42
    let v1: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v1["rules"]["time_scale"], 42);

    // 3. Council replaces a guardian -> time_scale remains 42
    let r_replace = dao
        .call(env.ward.id(), "council_replace_guardian")
        .args_json(json!({
            "trust_id": trust_id,
            "old": g1.id(),
            "new": { "account": new_g.id(), "circle": "Maternal" },
        }))
        .transact()
        .await
        .unwrap();
    assert!(r_replace.is_success());

    let v2: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v2["rules"]["time_scale"], 42);

    // 4. Death is attested and activated -> time_scale remains 42
    let dummy_hash = vec![1u8; 32];
    for g in [&new_g, &g2, &g3] {
        let _ = g
            .call(env.ward.id(), "attest_death")
            .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
            .transact()
            .await
            .unwrap();
    }

    let fin = settlor
        .call(env.ward.id(), "finalize_activation")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .unwrap();
    assert!(fin.is_success());

    let v3: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v3["rules"]["time_scale"], 42);
    assert_eq!(v3["status"], "Active");
}

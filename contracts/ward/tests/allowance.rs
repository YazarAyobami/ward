//! Integration tests — ROADMAP W-5.4. Names state the rule they check.
mod common;

use std::time::Duration;

use near_workspaces::types::NearToken;
use near_workspaces::Account;
use serde_json::json;

async fn create_test_trust(
    env: &common::Env,
    settlor: &Account,
    caregiver: &Account,
    guardians: &[(&Account, &str)],
    school: &Account,
    rules: serde_json::Value,
    deposit_amount: u128,
) -> u64 {
    let guardian_objs: Vec<_> = guardians
        .iter()
        .map(|(g, circle)| json!({ "account": g.id(), "circle": circle }))
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
            "payees": [
                { "account": school.id(), "label": "School", "kind": "School" },
            ],
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
    g1: &Account,
    g2: &Account,
    g3: &Account,
    rules: serde_json::Value,
    deposit_amount: u128,
) -> u64 {
    let school = env.user("school").await;
    let guardians = [(g1, "Maternal"), (g2, "Paternal"), (g3, "Community")];
    let trust_id = create_test_trust(
        env,
        settlor,
        caregiver,
        &guardians,
        &school,
        rules,
        deposit_amount,
    )
    .await;

    env.register_storage(caregiver).await;

    let dummy_hash = vec![1u8; 32];
    for g in [g1, g2, g3] {
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
async fn allowance_pays_once_per_period() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    // 3-second period
    rules["allowance_period"] = json!((3 * common::NS_PER_SECOND).to_string());
    rules["allowance_amount"] = json!((150 * common::TUSDC).to_string());

    let deposit_amount = 500 * common::TUSDC;
    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &g1,
        &g2,
        &g3,
        rules,
        deposit_amount,
    )
    .await;

    // Immediately after activation, 0 periods elapsed → E30_NOTHING_DUE
    let early_claim = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("early claim");
    assert!(early_claim.is_failure());
    let err = format!("{:?}", early_claim.failures());
    assert!(
        err.contains("E30_NOTHING_DUE"),
        "expected E30_NOTHING_DUE in {err}"
    );

    // Wait for 1 period to elapse
    tokio::time::sleep(Duration::from_millis(3200)).await;

    // First claim succeeds
    let claim1 = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim 1");
    assert!(
        claim1.is_success(),
        "claim 1 failed: {:?}",
        claim1.failures()
    );

    let caregiver_bal = env.balance(&caregiver).await;
    assert_eq!(caregiver_bal, 150 * common::TUSDC);

    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["balance"], (350 * common::TUSDC).to_string());

    // Immediate second claim in the same period fails with E30_NOTHING_DUE
    let claim2 = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim 2");
    assert!(claim2.is_failure());
    let err2 = format!("{:?}", claim2.failures());
    assert!(
        err2.contains("E30_NOTHING_DUE"),
        "expected E30_NOTHING_DUE in {err2}"
    );

    // Wait for next period
    tokio::time::sleep(Duration::from_millis(3200)).await;

    // Third claim in new period succeeds
    let claim3 = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim 3");
    assert!(
        claim3.is_success(),
        "claim 3 failed: {:?}",
        claim3.failures()
    );
    let caregiver_bal2 = env.balance(&caregiver).await;
    assert_eq!(caregiver_bal2, 300 * common::TUSDC);
}

#[tokio::test]
async fn allowance_max_one_period_arrears() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    // 2-second period
    rules["allowance_period"] = json!((2 * common::NS_PER_SECOND).to_string());
    rules["allowance_amount"] = json!((100 * common::TUSDC).to_string());

    let deposit_amount = 500 * common::TUSDC;
    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &g1,
        &g2,
        &g3,
        rules,
        deposit_amount,
    )
    .await;

    // Wait ~6.5 seconds (> 3 full periods elapsed)
    tokio::time::sleep(Duration::from_millis(6500)).await;

    // Claim pays only 1 period (100 tUSDC), not 4 periods (400 tUSDC)
    let claim = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim arrears");
    assert!(claim.is_success(), "claim failed: {:?}", claim.failures());

    let caregiver_bal = env.balance(&caregiver).await;
    assert_eq!(
        caregiver_bal,
        100 * common::TUSDC,
        "arrears should be capped at 1 period"
    );

    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["balance"], (400 * common::TUSDC).to_string());

    // Immediate second claim in the same period fails
    let claim2 = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim 2");
    assert!(claim2.is_failure());
}

#[tokio::test]
async fn allowance_works_while_paused() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["allowance_period"] = json!((1 * common::NS_PER_SECOND).to_string());
    rules["allowance_amount"] = json!((100 * common::TUSDC).to_string());

    let deposit_amount = 300 * common::TUSDC;
    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &g1,
        &g2,
        &g3,
        rules,
        deposit_amount,
    )
    .await;

    // Wait for 1 period to elapse
    tokio::time::sleep(Duration::from_millis(1200)).await;

    // Guardian pauses the trust
    let pause_res = g1
        .call(env.ward.id(), "pause")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("pause");
    assert!(
        pause_res.is_success(),
        "pause failed: {:?}",
        pause_res.failures()
    );

    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["paused"], true);

    // Caregiver claims allowance while trust is paused — must succeed
    let claim = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim while paused");
    assert!(
        claim.is_success(),
        "claim while paused failed: {:?}",
        claim.failures()
    );

    let caregiver_bal = env.balance(&caregiver).await;
    assert_eq!(caregiver_bal, 100 * common::TUSDC);

    let v2: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v2["balance"], (200 * common::TUSDC).to_string());
}

#[tokio::test]
async fn allowance_never_exceeds_balance() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["allowance_period"] = json!((1 * common::NS_PER_SECOND).to_string());
    rules["allowance_amount"] = json!((150 * common::TUSDC).to_string());

    // Balance is only 60 tUSDC, less than allowance_amount (150 tUSDC)
    let deposit_amount = 60 * common::TUSDC;
    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &g1,
        &g2,
        &g3,
        rules,
        deposit_amount,
    )
    .await;

    // Wait for 1 period to elapse
    tokio::time::sleep(Duration::from_millis(1200)).await;

    // Claim pays remaining balance (60 tUSDC)
    let claim = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim capped by balance");
    assert!(claim.is_success(), "claim failed: {:?}", claim.failures());

    let caregiver_bal = env.balance(&caregiver).await;
    assert_eq!(
        caregiver_bal,
        60 * common::TUSDC,
        "allowance should be capped by remaining balance"
    );

    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["balance"], "0");

    // Wait for next period
    tokio::time::sleep(Duration::from_millis(1200)).await;

    // Subsequent claim fails with E30_NOTHING_DUE because balance is 0
    let claim2 = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim on zero balance");
    assert!(claim2.is_failure());
    let err = format!("{:?}", claim2.failures());
    assert!(
        err.contains("E30_NOTHING_DUE"),
        "expected E30_NOTHING_DUE in {err}"
    );
}

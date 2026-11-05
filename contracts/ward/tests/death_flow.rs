//! Integration tests — ROADMAP W-5.3. Names state the rule they check.
mod common;

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

#[tokio::test]
async fn three_attestations_start_death_claim() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &school,
        env.default_rules(),
        100 * common::TUSDC,
    )
    .await;

    let dummy_hash = vec![1u8; 32];

    // 1st attestation: status is still Funding
    let r1 = g1
        .call(env.ward.id(), "attest_death")
        .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
        .transact()
        .await
        .expect("attest 1");
    assert!(r1.is_success());

    let v1: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v1["status"], "Funding");
    assert_eq!(v1["death_attestations"].as_array().unwrap().len(), 1);

    // 2nd attestation: status still Funding
    let r2 = g2
        .call(env.ward.id(), "attest_death")
        .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
        .transact()
        .await
        .expect("attest 2");
    assert!(r2.is_success());

    let v2: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v2["status"], "Funding");
    assert_eq!(v2["death_attestations"].as_array().unwrap().len(), 2);

    // 3rd attestation: quorum reached -> DeathClaimed
    let r3 = g3
        .call(env.ward.id(), "attest_death")
        .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
        .transact()
        .await
        .expect("attest 3");
    assert!(r3.is_success());

    let v3: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert!(v3["status"].get("DeathClaimed").is_some());
}

#[tokio::test]
async fn settlor_cancel_returns_to_funding() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &school,
        env.default_rules(),
        100 * common::TUSDC,
    )
    .await;

    let dummy_hash = vec![1u8; 32];
    for g in [&g1, &g2, &g3] {
        let _ = g
            .call(env.ward.id(), "attest_death")
            .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
            .transact()
            .await
            .expect("attest");
    }

    // Settlor cancels the false death claim
    let cancel_res = settlor
        .call(env.ward.id(), "cancel_death_claim")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("cancel");
    assert!(cancel_res.is_success());

    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["status"], "Funding");
    assert!(v["death_attestations"].as_array().unwrap().is_empty());
    assert!(!v["cancel_window"].is_null());
}

#[tokio::test]
async fn second_cancel_without_vouch_fails() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &school,
        env.default_rules(),
        100 * common::TUSDC,
    )
    .await;

    let dummy_hash = vec![1u8; 32];

    // 1st claim
    for g in [&g1, &g2, &g3] {
        let _ = g
            .call(env.ward.id(), "attest_death")
            .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
            .transact()
            .await
            .expect("attest");
    }

    // 1st cancel succeeds and opens the cancel window
    let c1 = settlor
        .call(env.ward.id(), "cancel_death_claim")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("cancel 1");
    assert!(c1.is_success());

    // Guardians attest death again while cancel window is open
    for g in [&g1, &g2, &g3] {
        let _ = g
            .call(env.ward.id(), "attest_death")
            .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
            .transact()
            .await
            .expect("attest again");
    }

    // 2nd cancel without guardian vouch fails with E14_VOUCH_REQUIRED
    let c2 = settlor
        .call(env.ward.id(), "cancel_death_claim")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("cancel 2");

    assert!(c2.is_failure());
    let err = format!("{:?}", c2.failures());
    assert!(
        err.contains("E14_VOUCH_REQUIRED"),
        "expected E14_VOUCH_REQUIRED in {err}"
    );
}

#[tokio::test]
async fn activation_after_waiting_period_snapshots_shares() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let anyone = env.user("anyone").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    // Fast-acting waiting period of 0 nanoseconds for instant activation
    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &school,
        rules,
        200 * common::TUSDC,
    )
    .await;

    let dummy_hash = vec![1u8; 32];
    for g in [&g1, &g2, &g3] {
        let _ = g
            .call(env.ward.id(), "attest_death")
            .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
            .transact()
            .await
            .expect("attest");
    }

    // Anyone can finalize activation after waiting period ends
    let fin = anyone
        .call(env.ward.id(), "finalize_activation")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("finalize_activation");
    assert!(fin.is_success(), "finalize failed: {:?}", fin.failures());

    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();

    assert_eq!(v["status"], "Active");
    assert_eq!(v["activation_balance"], (200 * common::TUSDC).to_string());
    assert!(!v["activated_at"].is_null());
    assert!(v["death_attestations"].as_array().unwrap().is_empty());
}

//! Integration tests — ROADMAP W-5.2. Names state the rule they check.
mod common;

use near_workspaces::types::NearToken;
use near_workspaces::Account;
use serde_json::json;

async fn create_and_fund_trust(
    env: &common::Env,
    settlor: &Account,
    caregiver: &Account,
    guardians: &[(&Account, &str)],
    school: &Account,
    deposit_amount: u128,
) -> u64 {
    let guardian_objs: Vec<_> = guardians
        .iter()
        .map(|(g, circle)| json!({ "account": g.id(), "circle": circle }))
        .collect();

    let res = settlor
        .call(env.ward.id(), "create_trust")
        .args_json(json!({
            "label": "Settlor Trust",
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
            "rules": env.default_rules(),
            "token": env.token.id(),
        }))
        .deposit(NearToken::from_near(1))
        .transact()
        .await
        .expect("create_trust")
        .into_result()
        .expect("trust id result");

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
        assert!(
            deposit_res.is_success(),
            "deposit failed: {:?}",
            deposit_res.failures()
        );
    }

    trust_id
}

#[tokio::test]
async fn withdrawal_under_free_cap_is_instant() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];

    let trust_id = create_and_fund_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &school,
        100 * common::TUSDC,
    )
    .await;

    // Default free cap is 50 tUSDC; 30 tUSDC is under the cap
    let res = settlor
        .call(env.ward.id(), "withdraw")
        .args_json(json!({
            "trust_id": trust_id,
            "amount": (30 * common::TUSDC).to_string(),
        }))
        .max_gas()
        .transact()
        .await
        .expect("withdraw under cap");
    assert!(res.is_success(), "withdraw failed: {:?}", res.failures());

    // Settlor receives payout instantly
    let settlor_bal = env.balance(&settlor).await;
    assert_eq!(settlor_bal, 30 * common::TUSDC);

    let trust_view: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .expect("get_trust view")
        .json()
        .expect("get_trust json");

    assert_eq!(trust_view["balance"], (70 * common::TUSDC).to_string());
    assert!(trust_view["pending_withdrawal"].is_null());
}

#[tokio::test]
async fn withdrawal_over_cap_is_delayed() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];

    let trust_id = create_and_fund_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &school,
        100 * common::TUSDC,
    )
    .await;

    // 60 tUSDC > 50 tUSDC free cap -> becomes pending withdrawal
    let res = settlor
        .call(env.ward.id(), "withdraw")
        .args_json(json!({
            "trust_id": trust_id,
            "amount": (60 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("withdraw over cap");
    assert!(res.is_success(), "withdraw failed: {:?}", res.failures());

    // Settlor has not received payout yet
    let settlor_bal = env.balance(&settlor).await;
    assert_eq!(settlor_bal, 0);

    let trust_view: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .expect("get_trust view")
        .json()
        .expect("get_trust json");

    assert_eq!(trust_view["balance"], (100 * common::TUSDC).to_string());
    let pending = &trust_view["pending_withdrawal"];
    assert!(!pending.is_null());
    assert_eq!(pending["amount"], (60 * common::TUSDC).to_string());
    assert_eq!(pending["vetoes"], json!([]));
}

#[tokio::test]
async fn two_circle_veto_cancels_withdrawal() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];

    let trust_id = create_and_fund_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &school,
        100 * common::TUSDC,
    )
    .await;

    // Settlor requests 60 tUSDC (above 50 tUSDC free cap)
    let _ = settlor
        .call(env.ward.id(), "withdraw")
        .args_json(json!({
            "trust_id": trust_id,
            "amount": (60 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("withdraw over cap");

    // Guardian 1 (Maternal) vetoes -> 1 circle veto
    let v1 = g1
        .call(env.ward.id(), "veto_withdrawal")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("veto 1");
    assert!(v1.is_success());

    let trust_view: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .expect("get_trust view")
        .json()
        .expect("get_trust json");
    assert!(!trust_view["pending_withdrawal"].is_null());

    // Guardian 2 (Paternal) vetoes -> 2nd circle veto, cancels pending withdrawal
    let v2 = g2
        .call(env.ward.id(), "veto_withdrawal")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("veto 2");
    assert!(v2.is_success());

    let trust_view_after: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .expect("get_trust view")
        .json()
        .expect("get_trust json");
    assert!(trust_view_after["pending_withdrawal"].is_null());

    // Executing cancelled withdrawal fails
    let exec = settlor
        .call(env.ward.id(), "execute_withdrawal")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("execute_withdrawal");
    assert!(exec.is_failure());
    let err = format!("{:?}", exec.failures());
    assert!(
        err.contains("E34_NO_PENDING_WITHDRAWAL"),
        "expected E34_NO_PENDING_WITHDRAWAL in {err}"
    );
}

#[tokio::test]
async fn no_withdrawal_while_death_claim_pending() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];

    let trust_id = create_and_fund_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &school,
        100 * common::TUSDC,
    )
    .await;

    // 3 guardians attest death to start a death claim
    let dummy_hash = vec![1u8; 32];
    let a1 = g1
        .call(env.ward.id(), "attest_death")
        .args_json(json!({
            "trust_id": trust_id,
            "evidence_hash": dummy_hash,
        }))
        .transact()
        .await
        .expect("attest 1");
    assert!(a1.is_success());

    let a2 = g2
        .call(env.ward.id(), "attest_death")
        .args_json(json!({
            "trust_id": trust_id,
            "evidence_hash": dummy_hash,
        }))
        .transact()
        .await
        .expect("attest 2");
    assert!(a2.is_success());

    let a3 = g3
        .call(env.ward.id(), "attest_death")
        .args_json(json!({
            "trust_id": trust_id,
            "evidence_hash": dummy_hash,
        }))
        .transact()
        .await
        .expect("attest 3");
    assert!(a3.is_success());

    // Verify DeathClaimed status
    let trust_view: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .expect("get_trust view")
        .json()
        .expect("get_trust json");
    assert!(trust_view["status"].get("DeathClaimed").is_some());

    // Settlor withdrawal is blocked during death claim
    let res = settlor
        .call(env.ward.id(), "withdraw")
        .args_json(json!({
            "trust_id": trust_id,
            "amount": (10 * common::TUSDC).to_string(),
        }))
        .transact()
        .await
        .expect("withdraw");

    assert!(res.is_failure());
    let err = format!("{:?}", res.failures());
    assert!(
        err.contains("E13_CLAIM_PENDING"),
        "expected E13_CLAIM_PENDING in {err}"
    );
}

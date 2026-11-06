//! Integration tests — ROADMAP W-5.7. Names state the rule they check.
mod common;

use near_sdk::base64::prelude::*;
use near_workspaces::types::NearToken;
use near_workspaces::Account;
use serde_json::json;

#[allow(clippy::too_many_arguments)]
async fn create_test_trust_with_dao(
    env: &common::Env,
    settlor: &Account,
    caregiver: &Account,
    guardians: &[(&Account, &str)],
    payees: &[(&Account, &str)],
    dao: &Account,
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

    let set_dao_res = settlor
        .call(env.ward.id(), "set_dao")
        .args_json(json!({ "trust_id": trust_id, "dao": dao.id() }))
        .transact()
        .await
        .expect("set_dao");
    assert!(set_dao_res.is_success());

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
async fn council_methods_reject_non_dao() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let dao = env.user("dao").await;
    let anyone = env.user("anyone").await;
    let new_g = env.user("newg").await;
    let new_cg = env.user("newcg").await;
    let clinic = env.user("clinic").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust_with_dao(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &[],
        &dao,
        env.default_rules(),
        100 * common::TUSDC,
    )
    .await;

    // 1. council_replace_guardian called by anyone fails with E06_NOT_DAO
    let r1 = anyone
        .call(env.ward.id(), "council_replace_guardian")
        .args_json(json!({
            "trust_id": trust_id,
            "old": g1.id(),
            "new": { "account": new_g.id(), "circle": "Maternal" },
        }))
        .transact()
        .await
        .expect("replace guardian non-dao");
    assert!(r1.is_failure());
    let err1 = format!("{:?}", r1.failures());
    assert!(
        err1.contains("E06_NOT_DAO"),
        "expected E06_NOT_DAO in {err1}"
    );

    // 2. council_set_caregiver called by anyone fails with E06_NOT_DAO
    let r2 = anyone
        .call(env.ward.id(), "council_set_caregiver")
        .args_json(json!({
            "trust_id": trust_id,
            "account": new_cg.id(),
            "circle": "Community",
        }))
        .transact()
        .await
        .expect("set caregiver non-dao");
    assert!(r2.is_failure());
    let err2 = format!("{:?}", r2.failures());
    assert!(
        err2.contains("E06_NOT_DAO"),
        "expected E06_NOT_DAO in {err2}"
    );

    // 3. council_add_payee called by anyone fails with E06_NOT_DAO
    let r3 = anyone
        .call(env.ward.id(), "council_add_payee")
        .args_json(json!({
            "trust_id": trust_id,
            "payee": { "account": clinic.id(), "label": "Clinic", "kind": "Clinic" },
        }))
        .transact()
        .await
        .expect("add payee non-dao");
    assert!(r3.is_failure());
    let err3 = format!("{:?}", r3.failures());
    assert!(
        err3.contains("E06_NOT_DAO"),
        "expected E06_NOT_DAO in {err3}"
    );
}

#[tokio::test]
async fn council_add_payee_registers_storage() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let dao = env.user("dao").await;
    let clinic = env.user("clinic").await;

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust_with_dao(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &[],
        &dao,
        env.default_rules(),
        100 * common::TUSDC,
    )
    .await;

    let v_before: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    let ops_before: u128 = v_before["ops_balance"].as_str().unwrap().parse().unwrap();

    // DAO calls council_add_payee
    let r = dao
        .call(env.ward.id(), "council_add_payee")
        .args_json(json!({
            "trust_id": trust_id,
            "payee": { "account": clinic.id(), "label": "St Mary Clinic", "kind": "Clinic" },
        }))
        .max_gas()
        .transact()
        .await
        .expect("council_add_payee");
    assert!(
        r.is_success(),
        "council_add_payee failed: {:?}",
        r.failures()
    );

    // Clinic is added to trust payees
    let v_after: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    let payees = v_after["payees"].as_array().unwrap();
    assert_eq!(payees.len(), 1);
    assert_eq!(payees[0]["account"], clinic.id().to_string());

    // ops_balance was reduced by STORAGE_DEPOSIT (10 millinear = 10_000_000_000_000_000_000_000 yocto)
    let ops_after: u128 = v_after["ops_balance"].as_str().unwrap().parse().unwrap();
    let storage_deposit = 10_000_000_000_000_000_000_000u128;
    assert_eq!(ops_before - ops_after, storage_deposit);

    // Clinic is now registered for storage on the mock token (balance check succeeds with 0)
    let clinic_bal = env.balance(&clinic).await;
    assert_eq!(clinic_bal, 0);
}

#[tokio::test]
async fn dao_never_moves_money() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let dao = env.user("dao").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust_with_dao(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &[],
        &dao,
        rules,
        100 * common::TUSDC,
    )
    .await;

    // Transition to Active so requests can be created
    let dummy_hash = vec![1u8; 32];
    for g in [&g1, &g2, &g3] {
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
    assert!(fin.is_success(), "fin failed: {:?}", fin.failures());

    // Guardian creates a VouchCancel request so request 0 exists
    let req_res = g1
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": "VouchCancel",
            "reason": "routine vouch",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create req")
        .into_result()
        .expect("req id");
    let req_id: u64 = req_res.json().expect("u64");

    // 1. DAO cannot withdraw (not settlor)
    let w = dao
        .call(env.ward.id(), "withdraw")
        .args_json(json!({ "trust_id": trust_id, "amount": (10 * common::TUSDC).to_string() }))
        .transact()
        .await
        .expect("dao withdraw");
    assert!(w.is_failure());
    let err_w = format!("{:?}", w.failures());
    assert!(err_w.contains("E02_NOT_SETTLOR"));

    // 2. DAO cannot approve requests (not guardian)
    let a = dao
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .transact()
        .await
        .expect("dao approve");
    assert!(a.is_failure());
    let err_a = format!("{:?}", a.failures());
    assert!(err_a.contains("E03_NOT_GUARDIAN"));

    // 3. DAO cannot claim allowance (not caregiver)
    let c = dao
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("dao claim allowance");
    assert!(c.is_failure());
    let err_c = format!("{:?}", c.failures());
    assert!(err_c.contains("E04_NOT_CAREGIVER"));

    // 4. DAO cannot claim graduation (not child)
    let g = dao
        .call(env.ward.id(), "claim_graduation")
        .args_json(json!({ "trust_id": trust_id, "child_idx": 0 }))
        .transact()
        .await
        .expect("dao claim graduation");
    assert!(g.is_failure());
    let err_g = format!("{:?}", g.failures());
    assert!(err_g.contains("E05_NOT_CHILD"));
}

#[tokio::test]
async fn sputnik_proposal_replaces_guardian() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let council_member = env.user("council").await;
    let new_g = env.user("newguard").await;

    // Deploy and initialise pinned Sputnik DAO v2 contract
    let sputnik_bytes = std::fs::read(common::SPUTNIK_WASM).expect("read sputnik wasm");
    let sputnik = env
        .worker
        .dev_deploy(&sputnik_bytes)
        .await
        .expect("deploy sputnik");

    let init_dao = sputnik
        .call("new")
        .args_json(json!({
            "config": {
                "name": "ward-council",
                "purpose": "Ward Community Council",
                "metadata": ""
            },
            "policy": [council_member.id()]
        }))
        .transact()
        .await
        .expect("sputnik new");
    assert!(
        init_dao.is_success(),
        "sputnik init failed: {:?}",
        init_dao.failures()
    );

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let trust_id = create_test_trust_with_dao(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &[],
        sputnik.as_account(),
        env.default_rules(),
        100 * common::TUSDC,
    )
    .await;

    // Build FunctionCall action to invoke ward.council_replace_guardian
    let replace_args = json!({
        "trust_id": trust_id,
        "old": g1.id(),
        "new": { "account": new_g.id(), "circle": "Maternal" }
    })
    .to_string();
    let replace_args_b64 = BASE64_STANDARD.encode(replace_args.as_bytes());

    // Council member creates proposal in Sputnik DAO (attaching 1 NEAR proposal bond)
    let prop_res = council_member
        .call(sputnik.id(), "add_proposal")
        .args_json(json!({
            "proposal": {
                "description": "replace g1 with new_g on ward council",
                "kind": {
                    "FunctionCall": {
                        "receiver_id": env.ward.id(),
                        "actions": [
                            {
                                "method_name": "council_replace_guardian",
                                "args": replace_args_b64,
                                "deposit": "0",
                                "gas": (50 * 1_000_000_000_000u64).to_string(), // 50 TGas
                            }
                        ]
                    }
                }
            }
        }))
        .deposit(NearToken::from_near(1))
        .max_gas()
        .transact()
        .await
        .expect("add_proposal")
        .into_result()
        .expect("proposal id");
    let prop_id: u64 = prop_res.json().expect("u64 prop_id");

    // Council member votes to approve proposal (VoteApprove automatically executes when threshold met)
    let act_res = council_member
        .call(sputnik.id(), "act_proposal")
        .args_json(json!({
            "id": prop_id,
            "action": "VoteApprove",
        }))
        .max_gas()
        .transact()
        .await
        .expect("act_proposal");
    assert!(
        act_res.is_success(),
        "act_proposal failed: {:?}",
        act_res.failures()
    );

    // Verify ward contract state: g1 was replaced with new_g in Maternal circle!
    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();

    let updated_guardians = v["guardians"].as_array().unwrap();
    assert_eq!(updated_guardians[0]["account"], new_g.id().to_string());
    assert_eq!(updated_guardians[0]["circle"], "Maternal");
}

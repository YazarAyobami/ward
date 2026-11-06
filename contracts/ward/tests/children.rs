//! Integration tests — ROADMAP W-5.6. Names state the rule they check.
mod common;

use near_workspaces::types::NearToken;
use near_workspaces::Account;
use serde_json::json;

#[allow(clippy::too_many_arguments)]
async fn create_test_trust(
    env: &common::Env,
    settlor: &Account,
    caregiver: &Account,
    guardians: &[(&Account, &str)],
    children: Vec<serde_json::Value>,
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
            "children": children,
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

#[allow(clippy::too_many_arguments)]
async fn setup_active_trust(
    env: &common::Env,
    settlor: &Account,
    caregiver: &Account,
    guardians: &[(&Account, &str)],
    children: Vec<serde_json::Value>,
    payees: &[(&Account, &str)],
    rules: serde_json::Value,
    deposit_amount: u128,
) -> u64 {
    let trust_id = create_test_trust(
        env,
        settlor,
        caregiver,
        guardians,
        children,
        payees,
        rules,
        deposit_amount,
    )
    .await;

    env.register_storage(caregiver).await;
    for (p, _) in payees {
        env.register_storage(p).await;
    }

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
async fn set_child_account_needs_two_circles() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let ada = env.user("ada").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let children = vec![
        json!({ "label": "Ada", "birth_ts": "0", "share_bps": 5000 }),
        json!({ "label": "Tobi", "birth_ts": "0", "share_bps": 5000 }),
    ];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        children,
        &[],
        rules,
        200 * common::TUSDC,
    )
    .await;

    // Caregiver requests to set Ada's account
    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": {
                "SetChildAccount": {
                    "child": 0,
                    "account": ada.id(),
                }
            },
            "reason": "Ada opened account",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create_request")
        .into_result()
        .expect("request id");
    let req_id: u64 = req_res.json().expect("u64 req_id");

    // 1st approval from Maternal guardian
    let a1 = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve 1");
    assert!(a1.is_success());

    // Still pending, Ada account not set yet
    let v1: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert!(v1["children"][0]["account"].is_null());

    // 2nd approval from Paternal guardian (2nd circle) executes request
    let a2 = g2
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve 2");
    assert!(a2.is_success());

    // Now Ada account is set
    let v2: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v2["children"][0]["account"], ada.id().to_string());
}

#[tokio::test]
async fn child_flag_requires_age_14() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;
    let ada_teen = env.user("adateen").await;
    let tobi_young = env.user("tobiyoung").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["flag_age_years"] = json!(14);

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    // Ada is born at 0 (age ~56 >= 14); Tobi is born at year 2050 (future, age 0 < 14)
    let children = vec![
        json!({ "label": "Ada", "birth_ts": "0", "share_bps": 5000 }),
        json!({ "label": "Tobi", "birth_ts": "2500000000000000000", "share_bps": 5000 }),
    ];
    let payees = [(&school, "School")];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        children,
        &payees,
        rules,
        500 * common::TUSDC,
    )
    .await;

    // Set accounts for both children
    for (idx, acc) in [(0u8, &ada_teen), (1u8, &tobi_young)] {
        let r = caregiver
            .call(env.ward.id(), "create_request")
            .args_json(json!({
                "trust_id": trust_id,
                "kind": { "SetChildAccount": { "child": idx, "account": acc.id() } },
                "reason": "register account",
                "receipt_hash": null,
            }))
            .transact()
            .await
            .unwrap()
            .into_result()
            .unwrap();
        let id: u64 = r.json().unwrap();
        let _ = g1
            .call(env.ward.id(), "approve")
            .args_json(json!({ "request_id": id }))
            .max_gas()
            .transact()
            .await
            .unwrap();
        let _ = g2
            .call(env.ward.id(), "approve")
            .args_json(json!({ "request_id": id }))
            .max_gas()
            .transact()
            .await
            .unwrap();
    }

    // Caregiver creates PayeePayment request
    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "PayeePayment": { "payee": school.id(), "amount": (30 * common::TUSDC).to_string() } },
            "reason": "fees",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .unwrap()
        .into_result()
        .unwrap();
    let req_id: u64 = req_res.json().unwrap();

    // Tobi (age 0 < 14) attempts to flag -> fails with E22_TOO_YOUNG
    let flag_young = tobi_young
        .call(env.ward.id(), "flag")
        .args_json(json!({ "request_id": req_id, "child_idx": 1 }))
        .transact()
        .await
        .expect("flag young");
    assert!(flag_young.is_failure());
    let err = format!("{:?}", flag_young.failures());
    assert!(
        err.contains("E22_TOO_YOUNG"),
        "expected E22_TOO_YOUNG in {err}"
    );

    // Ada (age >= 14) flags -> succeeds
    let flag_teen = ada_teen
        .call(env.ward.id(), "flag")
        .args_json(json!({ "request_id": req_id, "child_idx": 0 }))
        .transact()
        .await
        .expect("flag teen");
    assert!(flag_teen.is_success());

    let reqs: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    let flagged_req = reqs.iter().find(|r| r["id"] == req_id).unwrap();
    assert_eq!(flagged_req["child_flagged"], true);
}

#[tokio::test]
async fn flagged_request_needs_two_circles() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;
    let ada_teen = env.user("adateen").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["flag_age_years"] = json!(14);

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let children = vec![
        json!({ "label": "Ada", "birth_ts": "0", "share_bps": 5000 }),
        json!({ "label": "Tobi", "birth_ts": "0", "share_bps": 5000 }),
    ];
    let payees = [(&school, "School")];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        children,
        &payees,
        rules,
        500 * common::TUSDC,
    )
    .await;

    // Set Ada's account
    let set_acc = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "SetChildAccount": { "child": 0, "account": ada_teen.id() } },
            "reason": "register Ada",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .unwrap()
        .into_result()
        .unwrap();
    let set_id: u64 = set_acc.json().unwrap();
    let _ = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": set_id }))
        .max_gas()
        .transact()
        .await
        .unwrap();
    let _ = g2
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": set_id }))
        .max_gas()
        .transact()
        .await
        .unwrap();

    // Create PayeePayment request (normally 1 guardian suffices)
    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "PayeePayment": { "payee": school.id(), "amount": (40 * common::TUSDC).to_string() } },
            "reason": "suspicious fee",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .unwrap()
        .into_result()
        .unwrap();
    let req_id: u64 = req_res.json().unwrap();

    // Ada flags the request
    let flag_res = ada_teen
        .call(env.ward.id(), "flag")
        .args_json(json!({ "request_id": req_id, "child_idx": 0 }))
        .transact()
        .await
        .unwrap();
    assert!(flag_res.is_success());

    // Single guardian approval is now INSUFFICIENT because the request is flagged
    let a1 = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .unwrap();
    assert!(a1.is_success());

    // Still pending, no payout
    let reqs: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    let r = reqs.iter().find(|x| x["id"] == req_id).unwrap();
    assert_eq!(r["status"], "Pending");
    assert_eq!(env.balance(&school).await, 0);

    // Second guardian from different circle approves -> now executed
    let a2 = g2
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .unwrap();
    assert!(a2.is_success());

    let reqs2: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    let r2 = reqs2.iter().find(|x| x["id"] == req_id).unwrap();
    assert_eq!(r2["status"], "Executed");
    assert_eq!(env.balance(&school).await, 40 * common::TUSDC);
}

#[tokio::test]
async fn graduation_pays_in_tranches() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let graduate = env.user("graduate").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["majority_age_years"] = json!(18);
    rules["graduation_tranches"] = json!(3);
    // 3-second tranche unlocking period
    rules["allowance_period"] = json!((3 * common::NS_PER_SECOND).to_string());

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    // Graduate born at 0 (age >= 18), 100% share (10000 bps)
    let children = vec![json!({ "label": "Graduate", "birth_ts": "0", "share_bps": 10000 })];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        children,
        &[],
        rules,
        300 * common::TUSDC,
    )
    .await;

    // Set graduate's account
    let set_acc = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "SetChildAccount": { "child": 0, "account": graduate.id() } },
            "reason": "register graduate",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .unwrap()
        .into_result()
        .unwrap();
    let set_id: u64 = set_acc.json().unwrap();
    let _ = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": set_id }))
        .max_gas()
        .transact()
        .await
        .unwrap();
    let _ = g2
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": set_id }))
        .max_gas()
        .transact()
        .await
        .unwrap();

    // Wait 3.2s for 1st tranche period
    tokio::time::sleep(std::time::Duration::from_millis(3200)).await;

    // Tranche 1: 300 / 3 = 100 tUSDC
    let t1 = graduate
        .call(env.ward.id(), "claim_graduation")
        .args_json(json!({ "trust_id": trust_id, "child_idx": 0 }))
        .max_gas()
        .transact()
        .await
        .expect("claim tranche 1");
    assert!(t1.is_success());
    assert_eq!(env.balance(&graduate).await, 100 * common::TUSDC);

    // Immediate claim for tranche 2 fails before next period elapses
    let t2_early = graduate
        .call(env.ward.id(), "claim_graduation")
        .args_json(json!({ "trust_id": trust_id, "child_idx": 0 }))
        .max_gas()
        .transact()
        .await
        .expect("claim early tranche 2");
    assert!(t2_early.is_failure());
    let err = format!("{:?}", t2_early.failures());
    assert!(err.contains("E41_TRANCHE_NOT_DUE"));

    // Wait for next period
    tokio::time::sleep(std::time::Duration::from_millis(3200)).await;

    // Tranche 2: remaining 200 / 2 = 100 tUSDC
    let t2 = graduate
        .call(env.ward.id(), "claim_graduation")
        .args_json(json!({ "trust_id": trust_id, "child_idx": 0 }))
        .max_gas()
        .transact()
        .await
        .expect("claim tranche 2");
    assert!(t2.is_success());
    assert_eq!(env.balance(&graduate).await, 200 * common::TUSDC);

    // Wait for final period
    tokio::time::sleep(std::time::Duration::from_millis(3200)).await;

    // Tranche 3: remaining 100 / 1 = 100 tUSDC
    let t3 = graduate
        .call(env.ward.id(), "claim_graduation")
        .args_json(json!({ "trust_id": trust_id, "child_idx": 0 }))
        .max_gas()
        .transact()
        .await
        .expect("claim tranche 3");
    assert!(t3.is_success());
    assert_eq!(env.balance(&graduate).await, 300 * common::TUSDC);

    // Trust balance is now 0 and status is Closed
    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["balance"], "0");
    assert_eq!(v["status"], "Closed");
}

#[tokio::test]
async fn child_deceased_moves_share_to_siblings() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let children = vec![
        json!({ "label": "Ada", "birth_ts": "0", "share_bps": 5000 }),
        json!({ "label": "Tobi", "birth_ts": "0", "share_bps": 5000 }),
    ];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        children,
        &[],
        rules,
        200 * common::TUSDC,
    )
    .await;

    // Caregiver creates ChildDeceased request for Ada (child 0)
    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "ChildDeceased": { "child": 0 } },
            "reason": "child passed away",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .unwrap()
        .into_result()
        .unwrap();
    let req_id: u64 = req_res.json().unwrap();

    // 2-circle approval
    let _ = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .unwrap();
    let _ = g2
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .unwrap();

    // Verify Ada is marked deceased and Tobi's share is now 10000 bps (100%)
    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["children"][0]["alive"], false);
    assert_eq!(v["children"][1]["alive"], true);
    assert_eq!(v["children"][1]["share_bps"], 10000);
}

#[tokio::test]
async fn add_child_only_while_funding() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let children = vec![
        json!({ "label": "Ada", "birth_ts": "0", "share_bps": 5000 }),
        json!({ "label": "Tobi", "birth_ts": "0", "share_bps": 5000 }),
    ];

    // Create trust in Funding status
    let trust_id = create_test_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        children,
        &[],
        rules,
        100 * common::TUSDC,
    )
    .await;

    // While in Funding: add 3rd child succeeds
    let add_res = settlor
        .call(env.ward.id(), "add_child")
        .args_json(json!({
            "trust_id": trust_id,
            "child": { "label": "Chidi", "birth_ts": "0", "share_bps": 2000 },
            "new_shares_bps": [4000, 4000, 2000],
        }))
        .transact()
        .await
        .expect("add_child");
    assert!(add_res.is_success());

    let v1: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v1["children"].as_array().unwrap().len(), 3);
    assert_eq!(v1["children"][2]["label"], "Chidi");

    // Transition trust to DeathClaimed
    let dummy_hash = vec![1u8; 32];
    for g in [&g1, &g2, &g3] {
        let _ = g
            .call(env.ward.id(), "attest_death")
            .args_json(json!({ "trust_id": trust_id, "evidence_hash": dummy_hash }))
            .transact()
            .await
            .expect("attest");
    }

    // Now in DeathClaimed: add_child fails with E12_INVALID_STATUS
    let add_claimed = settlor
        .call(env.ward.id(), "add_child")
        .args_json(json!({
            "trust_id": trust_id,
            "child": { "label": "Dayo", "birth_ts": "0", "share_bps": 1000 },
            "new_shares_bps": [3500, 3500, 2000, 1000],
        }))
        .transact()
        .await
        .expect("add_child while claimed");
    assert!(add_claimed.is_failure());
    let err = format!("{:?}", add_claimed.failures());
    assert!(
        err.contains("E12_INVALID_STATUS"),
        "expected E12_INVALID_STATUS in {err}"
    );
}

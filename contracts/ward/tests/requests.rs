//! Integration tests — ROADMAP W-5.5. Names state the rule they check.
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
    payees: &[(&Account, &str)],
    rules: serde_json::Value,
    deposit_amount: u128,
) -> u64 {
    let trust_id = create_test_trust(
        env,
        settlor,
        caregiver,
        guardians,
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
async fn payee_payment_needs_one_guardian() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["large_threshold"] = json!((100 * common::TUSDC).to_string());

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let payees = [(&school, "School")];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &payees,
        rules,
        500 * common::TUSDC,
    )
    .await;

    // Caregiver creates PayeePayment under large_threshold
    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": {
                "PayeePayment": {
                    "payee": school.id(),
                    "amount": (50 * common::TUSDC).to_string(),
                }
            },
            "reason": "term 1 tuition",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create_request")
        .into_result()
        .expect("request id");
    let req_id: u64 = req_res.json().expect("u64 req_id");

    // Single guardian approval executes the payee payment
    let approve_res = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve");
    assert!(
        approve_res.is_success(),
        "approve failed: {:?}",
        approve_res.failures()
    );

    // School receives 50 tUSDC directly
    let school_bal = env.balance(&school).await;
    assert_eq!(school_bal, 50 * common::TUSDC);

    // Trust balance decreased to 450 tUSDC
    let v: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v["balance"], (450 * common::TUSDC).to_string());

    // Request status is Executed
    let reqs: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(reqs[0]["status"], "Executed");
}

#[tokio::test]
async fn large_spend_rejects_caregiver_circle_only() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1_pat = env.user("g1pat").await;
    let g2_pat = env.user("g2pat").await;
    let g3_mat = env.user("g3mat").await;
    let hospital = env.user("hospital").await;

    env.register_storage(&hospital).await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["large_threshold"] = json!((100 * common::TUSDC).to_string());

    // Caregiver circle is Paternal; 2 guardians in Paternal, 1 in Maternal
    let guardians = [
        (&g1_pat, "Paternal"),
        (&g2_pat, "Paternal"),
        (&g3_mat, "Maternal"),
    ];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &[],
        rules,
        500 * common::TUSDC,
    )
    .await;

    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": {
                "LargeSpend": {
                    "to": hospital.id(),
                    "amount": (150 * common::TUSDC).to_string(),
                }
            },
            "reason": "emergency surgery",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create_request")
        .into_result()
        .expect("request id");
    let req_id: u64 = req_res.json().expect("u64 req_id");

    // First Paternal guardian approves
    let a1 = g1_pat
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve 1");
    assert!(a1.is_success());

    // Second Paternal guardian approves — both from caregiver circle (only 1 circle)
    let a2 = g2_pat
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve 2");
    assert!(a2.is_success());

    // Still Pending: cannot execute with caregiver circle only
    let reqs: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(reqs[0]["status"], "Pending");
    assert_eq!(env.balance(&hospital).await, 0);
}

#[tokio::test]
async fn large_spend_with_two_circles_executes() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1_pat = env.user("g1pat").await;
    let g2_pat = env.user("g2pat").await;
    let g3_mat = env.user("g3mat").await;
    let hospital = env.user("hospital").await;

    env.register_storage(&hospital).await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["large_threshold"] = json!((100 * common::TUSDC).to_string());

    let guardians = [
        (&g1_pat, "Paternal"),
        (&g2_pat, "Paternal"),
        (&g3_mat, "Maternal"),
    ];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &[],
        rules,
        500 * common::TUSDC,
    )
    .await;

    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": {
                "LargeSpend": {
                    "to": hospital.id(),
                    "amount": (150 * common::TUSDC).to_string(),
                }
            },
            "reason": "emergency surgery",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create_request")
        .into_result()
        .expect("request id");
    let req_id: u64 = req_res.json().expect("u64 req_id");

    // Paternal guardian approves
    let a1 = g1_pat
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve 1");
    assert!(a1.is_success());

    // Maternal guardian approves — now 2 circles, with one circle != caregiver_circle
    let a2 = g3_mat
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve 2");
    assert!(a2.is_success());

    // Executed! Hospital received funds
    let reqs: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(reqs[0]["status"], "Executed");
    assert_eq!(env.balance(&hospital).await, 150 * common::TUSDC);
}

#[tokio::test]
async fn two_circle_rejection_rejects() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let payees = [(&school, "School")];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &payees,
        rules,
        500 * common::TUSDC,
    )
    .await;

    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": {
                "PayeePayment": {
                    "payee": school.id(),
                    "amount": (50 * common::TUSDC).to_string(),
                }
            },
            "reason": "term fees",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create_request")
        .into_result()
        .expect("request id");
    let req_id: u64 = req_res.json().expect("u64 req_id");

    // 1st rejection from Maternal circle
    let r1 = g1
        .call(env.ward.id(), "reject")
        .args_json(json!({ "request_id": req_id }))
        .transact()
        .await
        .expect("reject 1");
    assert!(r1.is_success());

    // Still pending after 1 rejection
    let reqs1: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(reqs1[0]["status"], "Pending");

    // 2nd rejection from Paternal circle (2 distinct circles)
    let r2 = g2
        .call(env.ward.id(), "reject")
        .args_json(json!({ "request_id": req_id }))
        .transact()
        .await
        .expect("reject 2");
    assert!(r2.is_success());

    // Now Rejected
    let reqs2: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(reqs2[0]["status"], "Rejected");

    // Trying to approve a rejected request fails with E38_REQUEST_NOT_PENDING
    let app = g3
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .transact()
        .await
        .expect("approve rejected");
    assert!(app.is_failure());
    let err = format!("{:?}", app.failures());
    assert!(err.contains("E38_REQUEST_NOT_PENDING"));
}

#[tokio::test]
async fn request_limit_enforced() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["max_open_requests"] = json!(2);

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let payees = [(&school, "School")];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &payees,
        rules,
        500 * common::TUSDC,
    )
    .await;

    // 1st request succeeds
    let r1 = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "PayeePayment": { "payee": school.id(), "amount": (10 * common::TUSDC).to_string() } },
            "reason": "fee 1",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("req 1")
        .into_result()
        .expect("req 1 id");
    let req1_id: u64 = r1.json().expect("u64");

    // 2nd request succeeds (cap is 2)
    let _ = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "PayeePayment": { "payee": school.id(), "amount": (20 * common::TUSDC).to_string() } },
            "reason": "fee 2",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("req 2")
        .into_result()
        .expect("req 2 id");

    // 3rd request hits max_open_requests cap -> E19_TOO_MANY_REQUESTS
    let r3 = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "PayeePayment": { "payee": school.id(), "amount": (30 * common::TUSDC).to_string() } },
            "reason": "fee 3",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("req 3");
    assert!(r3.is_failure());
    let err = format!("{:?}", r3.failures());
    assert!(err.contains("E19_TOO_MANY_REQUESTS"));

    // Approve and execute request 1 so an open slot is freed
    let app = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req1_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve req 1");
    assert!(app.is_success());

    // Now 3rd request succeeds
    let r3_retry = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": { "PayeePayment": { "payee": school.id(), "amount": (30 * common::TUSDC).to_string() } },
            "reason": "fee 3",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("req 3 retry");
    assert!(r3_retry.is_success());
}

#[tokio::test]
async fn pause_blocks_all_but_allowance() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");
    rules["allowance_period"] = json!((1 * common::NS_PER_SECOND).to_string());
    rules["allowance_amount"] = json!((100 * common::TUSDC).to_string());

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let payees = [(&school, "School")];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &payees,
        rules,
        500 * common::TUSDC,
    )
    .await;

    // Guardian pauses the trust
    let p = g1
        .call(env.ward.id(), "pause")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("pause");
    assert!(p.is_success());

    // Caregiver creates spending request while paused
    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": {
                "PayeePayment": {
                    "payee": school.id(),
                    "amount": (50 * common::TUSDC).to_string(),
                }
            },
            "reason": "urgent fee",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create_request")
        .into_result()
        .expect("request id");
    let req_id: u64 = req_res.json().expect("u64 req_id");

    // Guardian approves: status becomes Approved, but execution is blocked because paused
    let app = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .max_gas()
        .transact()
        .await
        .expect("approve");
    assert!(app.is_success());

    let reqs: Vec<serde_json::Value> = env
        .ward
        .view("get_requests")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(reqs[0]["status"], "Approved");
    assert_eq!(env.balance(&school).await, 0);

    // Allowance still works while paused
    tokio::time::sleep(std::time::Duration::from_millis(1200)).await;
    let allow = caregiver
        .call(env.ward.id(), "claim_allowance")
        .args_json(json!({ "trust_id": trust_id }))
        .max_gas()
        .transact()
        .await
        .expect("claim allowance");
    assert!(allow.is_success());
    assert_eq!(env.balance(&caregiver).await, 100 * common::TUSDC);
}

#[tokio::test]
async fn unpause_needs_two_circles() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let mut rules = env.default_rules();
    rules["waiting_period"] = json!("0");

    let guardians = [(&g1, "Maternal"), (&g2, "Paternal"), (&g3, "Community")];
    let payees = [(&school, "School")];

    let trust_id = setup_active_trust(
        &env,
        &settlor,
        &caregiver,
        &guardians,
        &payees,
        rules,
        500 * common::TUSDC,
    )
    .await;

    // Guardian pauses the trust
    let _ = g1
        .call(env.ward.id(), "pause")
        .args_json(json!({ "trust_id": trust_id }))
        .transact()
        .await
        .expect("pause");

    // Caregiver creates an Unpause request
    let req_res = caregiver
        .call(env.ward.id(), "create_request")
        .args_json(json!({
            "trust_id": trust_id,
            "kind": "Unpause",
            "reason": "investigation cleared",
            "receipt_hash": null,
        }))
        .transact()
        .await
        .expect("create unpause")
        .into_result()
        .expect("request id");
    let req_id: u64 = req_res.json().expect("u64 req_id");

    // 1st approval from Maternal guardian
    let a1 = g1
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .transact()
        .await
        .expect("approve 1");
    assert!(a1.is_success());

    // Still paused after 1 circle
    let v1: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v1["paused"], true);

    // 2nd approval from Paternal guardian (2nd circle)
    let a2 = g2
        .call(env.ward.id(), "approve")
        .args_json(json!({ "request_id": req_id }))
        .transact()
        .await
        .expect("approve 2");
    assert!(a2.is_success());

    // Trust is now unpaused!
    let v2: serde_json::Value = env
        .ward
        .view("get_trust")
        .args_json(json!({ "trust_id": trust_id }))
        .await
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(v2["paused"], false);
}

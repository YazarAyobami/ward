//! Integration tests — ROADMAP W-5.1. Names state the rule they check.
mod common;

use near_workspaces::types::NearToken;
use serde_json::json;

#[tokio::test]
async fn rejects_three_guardians_in_one_circle() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = json!([
        { "account": g1.id(), "circle": "Maternal" },
        { "account": g2.id(), "circle": "Maternal" },
        { "account": g3.id(), "circle": "Maternal" },
    ]);

    let res = settlor
        .call(env.ward.id(), "create_trust")
        .args_json(json!({
            "label": "Ada & Tobi",
            "caregiver": caregiver.id(),
            "caregiver_circle": "Paternal",
            "guardians": guardians,
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
        .expect("transact");

    assert!(res.is_failure());
    let err = format!("{:?}", res.failures());
    assert!(
        err.contains("E08_CIRCLE_LIMIT"),
        "expected E08_CIRCLE_LIMIT in {err}"
    );
}

#[tokio::test]
async fn rejects_guardians_from_one_circle_only() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let school = env.user("school").await;

    // 2 guardians from only one circle violates guardian count and diversity
    let guardians = json!([
        { "account": g1.id(), "circle": "Maternal" },
        { "account": g2.id(), "circle": "Maternal" },
    ]);

    let res = settlor
        .call(env.ward.id(), "create_trust")
        .args_json(json!({
            "label": "Ada & Tobi",
            "caregiver": caregiver.id(),
            "caregiver_circle": "Paternal",
            "guardians": guardians,
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
        .expect("transact");

    assert!(res.is_failure());
    let err = format!("{:?}", res.failures());
    assert!(
        err.contains("E07_GUARDIAN_COUNT") || err.contains("E09_CIRCLE_DIVERSITY"),
        "expected error in {err}"
    );
}

#[tokio::test]
async fn rejects_caregiver_as_guardian() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let school = env.user("school").await;

    // Caregiver is listed as a guardian
    let guardians = json!([
        { "account": caregiver.id(), "circle": "Maternal" },
        { "account": g1.id(), "circle": "Paternal" },
        { "account": g2.id(), "circle": "Community" },
    ]);

    let res = settlor
        .call(env.ward.id(), "create_trust")
        .args_json(json!({
            "label": "Ada & Tobi",
            "caregiver": caregiver.id(),
            "caregiver_circle": "Paternal",
            "guardians": guardians,
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
        .expect("transact");

    assert!(res.is_failure());
    let err = format!("{:?}", res.failures());
    assert!(
        err.contains("E11_CAREGIVER_IS_GUARDIAN"),
        "expected E11_CAREGIVER_IS_GUARDIAN in {err}"
    );
}

#[tokio::test]
async fn rejects_shares_not_summing_to_100_percent() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let school = env.user("school").await;

    let guardians = json!([
        { "account": g1.id(), "circle": "Maternal" },
        { "account": g2.id(), "circle": "Paternal" },
        { "account": g3.id(), "circle": "Community" },
    ]);

    // 5000 + 4000 = 9000 != 10000 bps
    let res = settlor
        .call(env.ward.id(), "create_trust")
        .args_json(json!({
            "label": "Ada & Tobi",
            "caregiver": caregiver.id(),
            "caregiver_circle": "Paternal",
            "guardians": guardians,
            "children": [
                { "label": "Ada", "birth_ts": "0", "share_bps": 5000 },
                { "label": "Tobi", "birth_ts": "0", "share_bps": 4000 },
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
        .expect("transact");

    assert!(res.is_failure());
    let err = format!("{:?}", res.failures());
    assert!(
        err.contains("E10_SHARES_SUM"),
        "expected E10_SHARES_SUM in {err}"
    );
}

#[tokio::test]
async fn council_replace_breaking_circle_rule_fails() {
    let env = common::setup().await;
    let settlor = env.user("settlor").await;
    let dao = env.user("dao").await;
    let caregiver = env.user("caregiver").await;
    let g1 = env.user("g1").await;
    let g2 = env.user("g2").await;
    let g3 = env.user("g3").await;
    let g4 = env.user("g4").await;
    let school = env.user("school").await;

    let guardians = json!([
        { "account": g1.id(), "circle": "Maternal" },
        { "account": g2.id(), "circle": "Paternal" },
        { "account": g3.id(), "circle": "Community" },
        { "account": g4.id(), "circle": "Institution" },
    ]);

    let res = settlor
        .call(env.ward.id(), "create_trust")
        .args_json(json!({
            "label": "Ada & Tobi",
            "caregiver": caregiver.id(),
            "caregiver_circle": "Paternal",
            "guardians": guardians,
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
        .expect("transact")
        .into_result()
        .expect("trust created");

    let trust_id: u64 = res.json().expect("trust_id json");

    // Settlor sets DAO
    let set_dao_res = settlor
        .call(env.ward.id(), "set_dao")
        .args_json(json!({
            "trust_id": trust_id,
            "dao": dao.id(),
        }))
        .transact()
        .await
        .expect("set_dao");
    assert!(set_dao_res.is_success());

    // Replace g2 (Paternal) with new_g2 (Maternal) -> now 2 in Maternal (g1, new_g2)
    let new_g2 = env.user("new_g2").await;
    let r1 = dao
        .call(env.ward.id(), "council_replace_guardian")
        .args_json(json!({
            "trust_id": trust_id,
            "old": g2.id(),
            "new": { "account": new_g2.id(), "circle": "Maternal" },
        }))
        .transact()
        .await
        .expect("council_replace_guardian 1");
    assert!(
        r1.is_success(),
        "first replacement failed: {:?}",
        r1.failures()
    );

    // Replace g3 (Community) with new_g3 (Maternal) -> would make 3 in Maternal -> fails E08
    let new_g3 = env.user("new_g3").await;
    let r2 = dao
        .call(env.ward.id(), "council_replace_guardian")
        .args_json(json!({
            "trust_id": trust_id,
            "old": g3.id(),
            "new": { "account": new_g3.id(), "circle": "Maternal" },
        }))
        .transact()
        .await
        .expect("council_replace_guardian 2");

    assert!(r2.is_failure());
    let err = format!("{:?}", r2.failures());
    assert!(
        err.contains("E08_CIRCLE_LIMIT"),
        "expected E08_CIRCLE_LIMIT in {err}"
    );
}

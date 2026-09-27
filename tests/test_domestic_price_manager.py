"""
Unit and Integration Tests for Domestic Commodity Price Manager
Golden Global Expo (GGE) Trade Desk & Admin Console

Verifies:
1. GET /api/prices includes domesticPacks for all catalog commodities
2. POST /api/prices allows Super-Admin to update domestic pack prices (500g, 1kg, 5kg, 25kg)
3. Updated domestic pack rates immediately reflect in GET /api/domestic-rates
4. Domestic orders placed at the updated rates are validated and accepted
5. Orders placed at tampered/old rates are rejected with 400
6. Negative or invalid domestic pack prices are rejected with 400
7. Anonymous requests to POST /api/prices return 401; non-admin roles return 403
8. Price changes persist to SQLite (CommodityPriceModel, CommoditySpecificationModel) and JSON mirrors
"""
import os
import json
import time
import pytest
from starlette.testclient import TestClient

from backend.core.config import ADMIN_PASSWORD, LOGISTICS_PASSWORD
from backend.db import SessionLocal, CommodityPriceModel, CommoditySpecificationModel, DATA_DIR


def get_token(client, email, password):
    resp = client.post("/api/admin/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["token"]


def get_admin_token(client):
    return get_token(client, "admin@goldenglobalexpo.com", ADMIN_PASSWORD)


def get_logistics_token(client):
    return get_token(client, "logistics@goldenglobalexpo.com", LOGISTICS_PASSWORD)


def test_get_prices_contains_domestic_packs(client):
    """Verify that GET /api/prices exposes domesticPacks alongside baseUsd."""
    resp = client.get("/api/prices")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "prices" in data
    prices = data["prices"]

    assert "p1" in prices
    p1 = prices["p1"]
    assert "domesticPacks" in p1
    dom_packs = p1["domesticPacks"]
    assert isinstance(dom_packs, dict)
    for pack in ["500g", "1kg", "5kg", "25kg"]:
        assert pack in dom_packs, f"Missing pack {pack} in p1 domesticPacks"
        assert dom_packs[pack] > 0


def test_admin_update_domestic_pack_prices(client, db_session):
    """Verify Super-Admin can update domestic INR pack rates via POST /api/prices."""
    admin_token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch initial prices
    initial_resp = client.get("/api/prices")
    assert initial_resp.status_code == 200
    init_p1 = initial_resp.json()["prices"]["p1"]["domesticPacks"]

    # Target new rates for p1
    new_p1_rates = {
        "500g": 95.0,
        "1kg": 185.0,
        "5kg": 890.0,
        "25kg": 4200.0
    }

    update_payload = {
        "prices": {
            "p1": {
                "baseUsd": 1280.0,
                "name": "Classic Toor (Tur Dal)",
                "category": "pulses",
                "domesticPacks": new_p1_rates
            }
        }
    }

    post_resp = client.post("/api/prices", json=update_payload, headers=headers)
    assert post_resp.status_code == 200
    assert post_resp.json()["success"] is True

    # 1. Verify GET /api/prices has updated rates
    get_resp = client.get("/api/prices")
    assert get_resp.status_code == 200
    p1_updated = get_resp.json()["prices"]["p1"]["domesticPacks"]
    assert p1_updated["500g"] == 95.0
    assert p1_updated["1kg"] == 185.0
    assert p1_updated["5kg"] == 890.0
    assert p1_updated["25kg"] == 4200.0

    # 2. Verify GET /api/domestic-rates reflects updated rates immediately
    dom_resp = client.get("/api/domestic-rates")
    assert dom_resp.status_code == 200
    dom_p1 = dom_resp.json()["rates"]["p1"]["packs"]
    assert dom_p1["500g"] == 95.0
    assert dom_p1["1kg"] == 185.0
    assert dom_p1["5kg"] == 890.0
    assert dom_p1["25kg"] == 4200.0

    # 3. Verify SQLite DB CommodityPriceModel
    db_session.expire_all()
    price_rec = db_session.query(CommodityPriceModel).filter_by(code="p1").first()
    assert price_rec is not None
    db_packs = json.loads(price_rec.domestic_packs_json)
    assert db_packs["500g"] == 95.0
    assert db_packs["1kg"] == 185.0

    # 4. Verify Placing domestic order at new rate is accepted
    order_id = f"GGE-DOM-PRC-{int(time.time())}"
    order_payload = {
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 2,
        "amount": 370.0,  # 185.0 * 2 = 370.0
        "name": "Price Test Buyer",
        "phone": "+91 98200 44556",
        "email": "pricetest@gge.com",
        "address": "GGE Test Terminal 1",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "is_mock": True
    }
    ord_resp = client.post("/api/domestic-orders", json=order_payload)
    assert ord_resp.status_code == 200
    assert ord_resp.json()["success"] is True

    # 5. Verify order at old rate is rejected as price tampering
    old_rate_order = {
        "orderId": f"GGE-DOM-PRC-OLD-{int(time.time())}",
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 2,
        "amount": 320.0,  # Old rate: 160.0 * 2 = 320.0, not matching 370.0
        "name": "Tamper Test Buyer",
        "phone": "+91 98200 44556",
        "address": "GGE Test Terminal 1",
        "city": "Mumbai",
        "pincode": "400001",
        "is_mock": True
    }
    tamper_resp = client.post("/api/domestic-orders", json=old_rate_order)
    assert tamper_resp.status_code == 400
    assert "Price tampering detected" in tamper_resp.json().get("error", "")

    # Cleanup: restore p1 rates back to original
    restore_payload = {
        "prices": {
            "p1": {
                "baseUsd": 1280.0,
                "domesticPacks": {
                    "500g": 85.0,
                    "1kg": 160.0,
                    "5kg": 775.0,
                    "25kg": 3750.0
                }
            }
        }
    }
    client.post("/api/prices", json=restore_payload, headers=headers)


def test_domestic_pricing_rbac_and_validation(client):
    """Verify auth and validation constraints on domestic pack updates."""
    # 1. Unauthenticated request -> 401
    anon_resp = client.post("/api/prices", json={
        "prices": {"p1": {"domesticPacks": {"1kg": 200.0}}}
    })
    assert anon_resp.status_code == 401

    # 2. Logistics role -> 403 Forbidden
    logistics_token = get_logistics_token(client)
    forbidden_resp = client.post(
        "/api/prices",
        json={"prices": {"p1": {"domesticPacks": {"1kg": 200.0}}}},
        headers={"Authorization": f"Bearer {logistics_token}"}
    )
    assert forbidden_resp.status_code == 403

    # 3. Invalid negative price -> 400
    admin_token = get_admin_token(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    neg_resp = client.post(
        "/api/prices",
        json={"prices": {"p1": {"domesticPacks": {"1kg": -50.0}}}},
        headers=admin_headers
    )
    assert neg_resp.status_code == 400
    assert "out of bounds" in neg_resp.json().get("error", "").lower()

    # 4. Invalid non-numeric price -> 400
    nan_resp = client.post(
        "/api/prices",
        json={"prices": {"p1": {"domesticPacks": {"1kg": "free"}}}},
        headers=admin_headers
    )
    assert nan_resp.status_code == 400

    # 5. Unsupported pack size -> 400
    bad_pack_resp = client.post(
        "/api/prices",
        json={"prices": {"p1": {"domesticPacks": {"100ton": 50000.0}}}},
        headers=admin_headers
    )
    assert bad_pack_resp.status_code == 400
    assert "Unsupported domestic pack size" in bad_pack_resp.json().get("error", "")


def test_update_only_domestic_packs_preserves_base_usd(client, db_session):
    """Verify that updating ONLY domestic packs does not wipe out base_usd to 0.0."""
    admin_token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Record initial base_usd for p3
    db_session.expire_all()
    p3_init = db_session.query(CommodityPriceModel).filter_by(code="p3").first()
    expected_base_usd = p3_init.base_usd
    assert expected_base_usd > 0

    # Update ONLY domestic pack prices, omitting baseUsd and price completely
    update_payload = {
        "prices": {
            "p3": {
                "domesticPacks": {
                    "500gm": 68.0,  # Test normalization of 500gm -> 500g
                    "1kg": 125.0,
                    "5kg": 590.0,
                    "25kg": 2800.0
                }
            }
        }
    }

    resp = client.post("/api/prices", json=update_payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Verify base_usd is preserved in SQLite CommodityPriceModel
    db_session.expire_all()
    p3_price = db_session.query(CommodityPriceModel).filter_by(code="p3").first()
    assert p3_price.base_usd == expected_base_usd, f"base_usd was wiped out! Expected {expected_base_usd}, got {p3_price.base_usd}"

    # Verify domesticPacks were updated and 500gm was normalized to 500g
    packs = json.loads(p3_price.domestic_packs_json)
    assert "500g" in packs
    assert packs["500g"] == 68.0
    assert packs["1kg"] == 125.0

    # Verify CommoditySpecificationModel also preserved base_usd
    p3_spec = db_session.query(CommoditySpecificationModel).filter_by(code="p3").first()
    if p3_spec:
        assert p3_spec.base_usd == expected_base_usd

    # Verify JSON mirrors also preserved base_usd
    prices_json_path = os.path.join(DATA_DIR, "prices.json")
    if os.path.exists(prices_json_path):
        with open(prices_json_path, "r", encoding="utf-8") as f:
            mirrored = json.load(f)
            assert mirrored["p3"]["baseUsd"] == expected_base_usd

    # Cleanup: restore p3
    restore_payload = {
        "prices": {
            "p3": {
                "baseUsd": expected_base_usd,
                "domesticPacks": {
                    "500g": 65.0,
                    "1kg": 120.0,
                    "5kg": 575.0,
                    "25kg": 2750.0
                }
            }
        }
    }
    client.post("/api/prices", json=restore_payload, headers=headers)


def test_custom_commodity_in_price_model_resolved_in_domestic_rates(client, db_session):
    """Verify that a commodity in CommodityPriceModel is exposed in get_current_rates."""
    from backend.services.domestic_order_service import DomesticOrderService

    # Add a custom price item with domestic packs
    custom_code = "p_test_custom_99"
    db_session.query(CommodityPriceModel).filter_by(code=custom_code).delete()
    db_session.commit()

    db_session.add(CommodityPriceModel(
        code=custom_code,
        name="Test Besan Superfine",
        category="Flour",
        base_usd=920.0,
        price_inr=920.0,
        margin_pct=0.0,
        domestic_packs_json=json.dumps({"500g": 55.0, "1kg": 105.0, "5kg": 500.0, "25kg": 2400.0})
    ))
    db_session.commit()

    rates = DomesticOrderService.get_current_rates()
    assert custom_code in rates
    assert rates[custom_code]["packs"]["1kg"] == 105.0

    # Verify calculation resolves it
    price = DomesticOrderService.calculate_price(custom_code, "1kg", 3)
    assert price == 315.0  # 105.0 * 3

    # Cleanup
    db_session.query(CommodityPriceModel).filter_by(code=custom_code).delete()
    db_session.commit()


def test_db_migration_does_not_overwrite_custom_prices(db_session):
    """Verify that running migrate_legacy_json_data does not revert custom domestic prices."""
    from backend.db import migrate_legacy_json_data

    # Set p4 to a custom non-default price
    p4 = db_session.query(CommodityPriceModel).filter_by(code="p4").first()
    assert p4 is not None
    custom_packs = {"500g": 72.5, "1kg": 138.0, "5kg": 640.0, "25kg": 3100.0}
    p4.domestic_packs_json = json.dumps(custom_packs)
    db_session.commit()

    # Re-run migration
    migrate_legacy_json_data()

    # Verify custom packs remain unchanged
    db_session.expire_all()
    p4_after = db_session.query(CommodityPriceModel).filter_by(code="p4").first()
    after_packs = json.loads(p4_after.domestic_packs_json)
    assert after_packs == custom_packs

    # Cleanup: restore default
    def_packs = {"500g": 70.0, "1kg": 130.0, "5kg": 625.0, "25kg": 3000.0}
    p4_after.domestic_packs_json = json.dumps(def_packs)
    db_session.commit()

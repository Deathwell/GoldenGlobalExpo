import pytest
from starlette.testclient import TestClient
from backend.app import app
from backend.core.config import ADMIN_PASSWORD

client = TestClient(app)

def get_admin_headers():
    login_resp = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_PASSWORD
    })
    token = login_resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_list_commodities():
    """Verify GET /api/commodities returns the active catalog."""
    res = client.get("/api/commodities")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] >= 16
    codes = [c["code"] for c in data["commodities"]]
    assert "p1" in codes
    assert "p5" in codes

    p1 = next(c for c in data["commodities"] if c["code"] == "p1")
    assert "Tur Dal" in p1["name"] or "Classic Toor" in p1["name"]
    assert p1["baseUsd"] > 0
    assert "hsCode" in p1
    assert "purity" in p1

def test_get_single_commodity():
    """Verify GET /api/commodities/{code} returns item details."""
    res = client.get("/api/commodities/p1")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["commodity"]["code"] == "p1"

    # Non-existent item
    res_404 = client.get("/api/commodities/non_existent_999")
    assert res_404.status_code == 404

def test_create_update_delete_commodity_rbac():
    """Verify CRUD lifecycle and RBAC enforcement for commodities."""
    # 1. Unauthenticated creation must be rejected with 401
    unauth_res = client.post("/api/commodities", json={"code": "p_test", "name": "Test Crop"})
    assert unauth_res.status_code == 401

    headers = get_admin_headers()

    # 2. Admin creates new commodity
    payload = {
        "code": "p_custom_flax",
        "name": "Organic Golden Flax Seeds",
        "botanical": "Linum usitatissimum",
        "category": "Seeds",
        "baseUsd": 1250.0,
        "purity": "99.8% Sortex",
        "moisture": "7.5% Max",
        "origin": "Madhya Pradesh (India)",
        "domesticPacks": {"1kg": 180, "5kg": 850}
    }
    create_res = client.post("/api/commodities", json=payload, headers=headers)
    assert create_res.status_code == 200
    assert create_res.json()["success"] is True

    # 3. Verify retrieved
    get_res = client.get("/api/commodities/p_custom_flax")
    assert get_res.status_code == 200
    assert get_res.json()["commodity"]["name"] == "Organic Golden Flax Seeds"

    # 4. Admin updates specs
    update_res = client.put("/api/commodities/p_custom_flax", json={
        "baseUsd": 1300.0,
        "purity": "99.9% Ultra Sortex"
    }, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()["commodity"]
    assert updated_data["baseUsd"] == 1300.0
    assert updated_data["purity"] == "99.9% Ultra Sortex"

    # 5. Admin deactivates commodity
    del_res = client.delete("/api/commodities/p_custom_flax", headers=headers)
    assert del_res.status_code == 200

    # 6. Verify excluded from active list
    list_res = client.get("/api/commodities?active_only=true")
    active_codes = [c["code"] for c in list_res.json()["commodities"]]
    assert "p_custom_flax" not in active_codes

def test_upload_commodity_certificate():
    """Verify attaching PDF Certificate of Analysis (COA) to a commodity."""
    headers = get_admin_headers()
    fake_pdf = b"%PDF-1.4 test certificate of analysis content"
    files = {"file": ("NABL_SGS_Assay.pdf", fake_pdf, "application/pdf")}

    res = client.post("/api/commodities/p1/certificate", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "COA_P1.pdf" in data["coaUrl"]

    # Verify commodity spec now includes COA URL
    get_res = client.get("/api/commodities/p1")
    assert get_res.status_code == 200
    assert "COA_P1.pdf" in get_res.json()["commodity"]["coaUrl"]

    # Verify downloading the uploaded certificate works
    dl_res = client.get(data["coaUrl"])
    assert dl_res.status_code == 200
    assert dl_res.content == fake_pdf
    assert dl_res.headers["content-type"] == "application/pdf"

    # Test invalid file extension rejection
    bad_files = {"file": ("malicious.exe", b"binary", "application/octet-stream")}
    bad_res = client.post("/api/commodities/p1/certificate", files=bad_files, headers=headers)
    assert bad_res.status_code == 400

    # Test invalid PDF header signature rejection
    fake_header_files = {"file": ("spoofed.pdf", b"NOT_A_REAL_PDF_HEADER", "application/pdf")}
    bad_sig_res = client.post("/api/commodities/p1/certificate", files=fake_header_files, headers=headers)
    assert bad_sig_res.status_code == 400
    assert "signature" in bad_sig_res.json()["detail"].lower()

    # Test 404 on non-existent certificate
    not_found_res = client.get("/api/documents/certificates/COA_NONEXISTENT.pdf")
    assert not_found_res.status_code == 404


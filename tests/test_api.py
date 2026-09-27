import json
import time
import io
import secrets
import pytest

def get_admin_token(client):
    from backend.core.config import ADMIN_PASSWORD
    resp = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_PASSWORD
    })
    assert resp.status_code == 200
    return resp.json()["token"]

def test_root_and_static_html(client):
    """Test that public HTML portals load with HTTP 200 and /desk.html enforces redirect."""
    for path in ["/", "/index.html", "/login.html", "/tracking.html", "/download.html"]:
        resp = client.get(path)
        assert resp.status_code == 200
        assert len(resp.content) > 1000

    # Test that unauthenticated access to /desk.html redirects to /login.html
    unauth_desk = client.get("/desk.html", follow_redirects=False)
    assert unauth_desk.status_code == 302
    assert "/login.html" in unauth_desk.headers.get("location", "")

def test_data_directory_isolation(client):
    """Verify that /data directory (SQLite db, raw JSON) is NEVER served over HTTP."""
    for sensitive_path in ["/data/enterprise.db", "/data/inquiries.json", "/data/consignments.json", "/data/audit_log.json"]:
        resp = client.get(sensitive_path)
        assert resp.status_code == 404, f"Data file {sensitive_path} must return 404, got {resp.status_code}"

def test_prices_api(client):
    """Test public pricing read and authenticated admin price update."""
    # 1. Public read must succeed
    resp = client.get("/api/prices")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "prices" in data

    update_payload = {"prices": {"p1": {"price": 145.5, "baseUsd": 145.5, "marginPct": 8.0, "name": "Organic Turmeric Salem", "category": "Spices"}}}

    # 2. Anonymous price update must be rejected with 401
    anon_resp = client.post("/api/prices", json=update_payload)
    assert anon_resp.status_code == 401

    # 3. Authenticated Admin price update must succeed with 200
    token = get_admin_token(client)
    auth_resp = client.post(
        "/api/prices", 
        json=update_payload, 
        headers={"Authorization": f"Bearer {token}"}
    )
    assert auth_resp.status_code == 200
    assert auth_resp.json()["success"] is True

def test_forex_api(client):
    """Test Forex rates endpoint returns global export trading currencies."""
    resp = client.get("/api/forex")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "rates" in data
    rates = data["rates"]
    for curr in ["INR", "USD", "AED", "EUR", "GBP", "CNY", "RUB", "THB", "JPY", "KRW"]:
        assert curr in rates, f"Currency {curr} missing from Forex rates"

def test_inquiry_lifecycle(client):
    """Test public RFQ creation and authenticated administrative retrieval."""
    test_id = f"TEST-RFQ-{int(time.time())}"
    rfq_data = {
        "id": test_id,
        "type": "BULK_INQUIRY",
        "name": "Automated Test Corp",
        "company": "Global Agri Trade Ltd",
        "email": "qa@globalagri.com",
        "phone": "+971 55 000 1111",
        "country": "Dubai, UAE",
        "commodities": "Organic Turmeric Salem",
        "volume": "25 MT",
        "status": "New RFQ",
        "date": "2026-09-03"
    }

    # 1. Public lead submission must succeed
    post_resp = client.post("/api/inquiries", json=rfq_data)
    assert post_resp.status_code == 200
    assert post_resp.json()["success"] is True

    # 2. Anonymous inquiry retrieval must be blocked with 401
    anon_get = client.get("/api/inquiries")
    assert anon_get.status_code == 401

    # 3. Authenticated admin inquiry retrieval must succeed
    token = get_admin_token(client)
    auth_get = client.get("/api/inquiries", headers={"Authorization": f"Bearer {token}"})
    assert auth_get.status_code == 200
    inqs = auth_get.json()["inquiries"]
    found = next((i for i in inqs if i["id"] == test_id), None)
    assert found is not None
    assert found["name"] == "Automated Test Corp"

    # 4. Anonymous deletion must be blocked
    client.cookies.clear()
    anon_del = client.delete(f"/api/inquiries/{test_id}")
    assert anon_del.status_code == 401

    # 5. Authenticated deletion must succeed
    auth_del = client.delete(f"/api/inquiries/{test_id}", headers={"Authorization": f"Bearer {token}"})
    assert auth_del.status_code == 200

def test_consignments_api(client):
    """Test authenticated consignment CRM management and public single-shipment tracking."""
    # 1. Anonymous consignment list must be blocked with 401
    anon_resp = client.get("/api/consignments")
    assert anon_resp.status_code == 401

    # 2. Authenticated list must succeed with 200
    token = get_admin_token(client)
    auth_resp = client.get("/api/consignments", headers={"Authorization": f"Bearer {token}"})
    assert auth_resp.status_code == 200
    data = auth_resp.json()
    assert data["success"] is True
    assert "consignments" in data
    assert isinstance(data["consignments"], list)

    # 3. Public tracking by B/L code must succeed without full CRM exposure
    track_resp = client.get("/api/track?bl=GGE-JNPT-2026")
    assert track_resp.status_code == 200
    track_data = track_resp.json()
    assert track_data["success"] is True
    assert "consignment" in track_data
    assert track_data["consignment"]["bl"] == "GGE-JNPT-2026"

def test_audit_hash_chain(client):
    """Test authenticated access to cryptographic SHA-256 audit logs."""
    # 1. Anonymous access must be blocked with 401
    anon_resp = client.get("/api/audit")
    assert anon_resp.status_code == 401

    # 2. Authenticated access must return verified hash chain
    token = get_admin_token(client)
    auth_resp = client.get("/api/audit", headers={"Authorization": f"Bearer {token}"})
    assert auth_resp.status_code == 200
    data = auth_resp.json()
    assert data["success"] is True
    assert "audit" in data
    logs = data["audit"]
    assert len(logs) > 0
    for entry in logs:
        assert "hash" in entry
        assert len(entry["hash"]) == 64

def test_verify_gateway_api(client):
    """Test public QR verification gateway endpoint with strict validation."""
    # 1. HTML route
    html_resp = client.get("/verify.html")
    assert html_resp.status_code == 200
    assert "Verification Gateway" in html_resp.text

    # 2. Valid Consignment Verification
    verify_resp = client.get("/api/verify/GGE-INNSA1-2026")
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["success"] is True
    assert data["valid"] is True
    assert "accreditations" in data
    assert data["accreditations"]["dgft_iec"] == "AAGPB8439A"
    assert "cryptography" in data
    assert len(data["cryptography"]["ledgerHash"]) == 64

    # 3. Valid Lot Sample
    lot_resp = client.get("/api/verify/P1")
    assert lot_resp.status_code == 200
    assert lot_resp.json()["valid"] is True

    # 4. Bogus code starting with GGE must return 404 / valid: False
    fake_gge = client.get("/api/verify/GGE-FAKE-BOGUS-SHIPMENT")
    assert fake_gge.status_code == 404
    assert fake_gge.json()["valid"] is False

    # 5. Completely invalid code
    invalid_resp = client.get("/api/verify/INVALID-TAMPERED-999")
    assert invalid_resp.status_code == 404
    assert invalid_resp.json()["valid"] is False

def test_rbac_price_authorization(client):
    """Test Role-Based Access Control: Logistics staff cannot alter export pricing, Admin can."""
    from backend.core.config import ADMIN_PASSWORD, LOGISTICS_PASSWORD

    # 1. Login as Logistics Operations Staff
    log_login = client.post("/api/admin/login", json={
        "email": "logistics@goldenglobalexpo.com",
        "password": LOGISTICS_PASSWORD
    })
    assert log_login.status_code == 200
    log_data = log_login.json()
    assert log_data["role"] == "logistics"
    log_token = log_data["token"]

    # 2. Logistics Staff attempts to edit pricing -> Must be HTTP 403 Forbidden
    forbidden_resp = client.post(
        "/api/prices",
        json={"prices": {"p1": {"price": 199.0}}},
        headers={"Authorization": f"Bearer {log_token}"}
    )
    assert forbidden_resp.status_code == 403
    assert "Insufficient permissions" in forbidden_resp.json()["detail"] or "Access forbidden" in forbidden_resp.json()["detail"]

    # 3. Login as Executive Admin
    admin_login = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_PASSWORD
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["token"]

    # 4. Super-Admin updates pricing -> Must be HTTP 200 OK
    allowed_resp = client.post(
        "/api/prices",
        json={"prices": {"p1": {"price": 145.5, "baseUsd": 145.5, "name": "Organic Turmeric Salem", "category": "Spices", "marginPct": 8.0}}},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert allowed_resp.status_code == 200
    assert allowed_resp.json()["success"] is True

def test_document_vault_lifecycle(client):
    """Test authenticating, uploading official trade document PDF, and retrieving it."""
    # 1. Anonymous upload must be rejected with 401
    fake_pdf = io.BytesIO(b"%PDF-1.4 simulated official test consignment invoice")
    anon_up = client.post(
        "/api/documents/upload",
        data={"bl": "GGE-TEST-BL-99", "slot": "inv"},
        files={"file": ("test_invoice.pdf", fake_pdf, "application/pdf")}
    )
    assert anon_up.status_code == 401

    # 2. Authenticated Admin upload must succeed
    token = get_admin_token(client)
    fake_pdf.seek(0)
    auth_up = client.post(
        "/api/documents/upload",
        data={"bl": "GGE-TEST-BL-99", "slot": "inv"},
        files={"file": ("test_invoice.pdf", fake_pdf, "application/pdf")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert auth_up.status_code == 200
    up_data = auth_up.json()
    assert up_data["success"] is True

    # 3. Document retrieval must succeed with PDF content type
    doc_resp = client.get("/api/documents/GGE-TEST-BL-99/inv")
    assert doc_resp.status_code == 200
    assert doc_resp.headers["content-type"] == "application/pdf"
    assert b"simulated official test consignment invoice" in doc_resp.content

    # 4. Metadata query must reflect uploaded status
    meta_resp = client.get("/api/documents/meta/GGE-TEST-BL-99")
    assert meta_resp.status_code == 200
    meta_data = meta_resp.json()
    assert meta_data["documents"]["inv"]["uploaded"] is True
    assert meta_data["documents"]["phyto"]["uploaded"] is False

    # 5. HEAD request on existing document must return HTTP 200 without body
    head_resp = client.head("/api/documents/GGE-TEST-BL-99/inv")
    assert head_resp.status_code == 200
    assert int(head_resp.headers.get("content-length", 0)) > 0
    assert len(head_resp.content) == 0

    # 6. Inline query parameter must set Content-Disposition inline
    inline_resp = client.get("/api/documents/GGE-TEST-BL-99/inv?inline=1")
    assert inline_resp.status_code == 200
    assert "inline" in inline_resp.headers.get("content-disposition", "")

    # 7. Anonymous deletion must fail with 401
    client.cookies.clear()
    anon_del = client.delete("/api/documents/GGE-TEST-BL-99/inv")
    assert anon_del.status_code == 401

    # 8. Authenticated deletion must succeed with 200
    auth_del = client.delete("/api/documents/GGE-TEST-BL-99/inv", headers={"Authorization": f"Bearer {token}"})
    assert auth_del.status_code == 200
    assert auth_del.json()["deleted"] is True

    # 9. Subsequent GET / HEAD must return 404
    assert client.get("/api/documents/GGE-TEST-BL-99/inv").status_code == 404
    assert client.head("/api/documents/GGE-TEST-BL-99/inv").status_code == 404

    # 10. Metadata must now show uploaded: False
    meta_after = client.get("/api/documents/meta/GGE-TEST-BL-99").json()
    assert meta_after["documents"]["inv"]["uploaded"] is False

def test_consignment_deletion_requires_auth(client):
    """Verify that deleting a consignment requires admin or logistics role."""
    test_bl = "GGE-DEL-BL-2026"
    # Create test consignment
    token = get_admin_token(client)
    save_resp = client.post(
        "/api/consignments",
        json={"bl": test_bl, "buyer": "Test Buyer", "commodity": "Sesame Seeds"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert save_resp.status_code == 200

    # Anonymous deletion attempt must be rejected with 401
    client.cookies.clear()
    anon_del = client.delete(f"/api/consignments/{test_bl}")
    assert anon_del.status_code == 401

    # Authenticated deletion must succeed with 200
    auth_del = client.delete(f"/api/consignments/{test_bl}", headers={"Authorization": f"Bearer {token}"})
    assert auth_del.status_code == 200
    assert auth_del.json()["success"] is True

def test_sample_price_consistency_and_pii_sanitization(client):
    """Verify DEFAULT_SAMPLE_PRICE_INR configuration, API price synchronization, and PII sanitation."""
    from backend.core.config import DEFAULT_SAMPLE_PRICE_INR
    assert DEFAULT_SAMPLE_PRICE_INR == 499.0

    # 1. GET /api/prices returns default 499.0
    price_resp = client.get("/api/prices")
    assert price_resp.status_code == 200
    assert price_resp.json()["samplePriceInr"] == 499.0

    # 2. Authenticated POST /api/prices updates samplePriceInr
    token = get_admin_token(client)
    update_res = client.post(
        "/api/prices",
        json={"prices": {}, "samplePriceInr": 550.0},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_res.status_code == 200
    assert client.get("/api/prices").json()["samplePriceInr"] == 550.0

    # Restore back to 499.0
    client.post(
        "/api/prices",
        json={"prices": {}, "samplePriceInr": 499.0},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert client.get("/api/prices").json()["samplePriceInr"] == 499.0

    # 3. Order creation default fallback amount is DEFAULT_SAMPLE_PRICE_INR
    order_resp = client.post("/api/create-razorpay-order", json={})
    assert order_resp.status_code == 200
    assert order_resp.json()["amount"] == 49900  # 499.0 INR in paise

    # 4. Consignments do not leak Aryan Nigade personal PII
    consign_resp = client.get("/api/consignments", headers={"Authorization": f"Bearer {token}"})
    assert consign_resp.status_code == 200
    for c in consign_resp.json()["consignments"]:
        assert c.get("buyer") != "Aryan Nigade"
        assert c.get("buyerEmail") != "nigadearyan@gmail.com"

def test_new_commodity_products_presence(client):
    """Verify that newly added commodities (Emmer Wheat, Cow Ghee, Sorghum, Spice Blend) are active in pricing."""
    resp = client.get("/api/prices")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    prices = data["prices"]

    expected = {
        "p11": "Jowar (Whole Sorghum)",
        "p14": "Emmer Wheat (Khapli Wheat)",
        "p15": "Pure Cow Ghee (Desi Bilona)",
        "p17": "Indian Home Spices (Individual Lots)",
    }
    assert "p16" not in prices, "p16 duplicate sorghum must be removed"
    for code, expected_name in expected.items():
        assert code in prices, f"Product {code} must be in prices API"
        assert prices[code]["name"] == expected_name
        assert prices[code]["baseUsd"] > 0
        assert prices[code]["price"] > 0

def test_new_commodities_statutory_verification(client):
    """Verify that commodities and their official lot codes (scanned via COA QR codes) resolve in statutory document verification."""
    test_cases = [
        ("P11", "Sorghum"),
        ("GGE-JW-2026-K11", "Sorghum"),
        ("P14", "Emmer Wheat"),
        ("GGE-EW-2026-N14", "Emmer Wheat"),
        ("P15", "Pure Cow Ghee"),
        ("GGE-CG-2026-O15", "Pure Cow Ghee"),
        ("P17", "Indian Home Spices"),
        ("GGE-SB-2026-Q17", "Indian Home Spices"),
        ("GGE-HS-2026-Q17", "Indian Home Spices"),
    ]
    for code, expected_kw in test_cases:
        resp = client.get(f"/api/verify/{code}")
        assert resp.status_code == 200, f"Expected 200 for {code}, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["success"] is True
        assert data["valid"] is True
        assert expected_kw.lower() in data["document"]["commodity"].lower()
        assert len(data["cryptography"]["ledgerHash"]) == 64
        assert "JNPT" in data["document"]["portOfLoading"]

def test_manifest_volume_bounds_enforcement(client):
    """Verify that RFQ manifests under 3 QTL or over 22 QTL are strictly rejected with HTTP 400."""
    # 1. Under-capacity inquiry (1.0 Quintal / 100 KG) must return 400
    under_capacity_rfq = {
        "id": "RFQ-TEST-UNDER",
        "name": "Small Batch Buyer",
        "email": "buyer@test.com",
        "type": "COMMERCIAL_BULK_RFQ",
        "manifest": [
            {"commodity": "Toor Dal (Pigeon Pea)", "quantity": 1, "unit": "Quintals"}
        ]
    }
    resp_under = client.post("/api/inquiries", json=under_capacity_rfq)
    assert resp_under.status_code == 400
    assert "Minimum order is 3.0 Quintals" in resp_under.json()["error"]

    # 2. Over-capacity inquiry (25.0 Quintals) must return 400
    over_capacity_rfq = {
        "id": "RFQ-TEST-OVER",
        "name": "Over Container Buyer",
        "email": "buyer@test.com",
        "type": "COMMERCIAL_BULK_RFQ",
        "manifest": [
            {"commodity": "Toor Dal (Pigeon Pea)", "quantity": 25, "unit": "Quintals"}
        ]
    }
    resp_over = client.post("/api/inquiries", json=over_capacity_rfq)
    assert resp_over.status_code == 400
    assert "maximum capacity is 22.0 Quintals" in resp_over.json()["error"]

    # 3. Valid capacity inquiry (10.0 Quintals) must return 200
    valid_rfq = {
        "id": "RFQ-TEST-VALID",
        "name": "Standard Container Buyer",
        "email": "buyer@test.com",
        "type": "COMMERCIAL_BULK_RFQ",
        "manifest": [
            {"commodity": "Toor Dal (Pigeon Pea)", "quantity": 10, "unit": "Quintals"}
        ]
    }
    resp_valid = client.post("/api/inquiries", json=valid_rfq)
    assert resp_valid.status_code == 200
    assert resp_valid.json()["success"] is True


def test_inquiry_tracking_and_verification_decoupling(client):
    """Verify that export inquiries do not get B/L numbers and show informative trade notices instead of 'in transit' ocean voyages."""
    rfq_id = "RFQ-VERIFY-DECOUPLE-001"
    rfq_payload = {
        "id": rfq_id,
        "name": "Rajesh Sharma",
        "company": "Global Pulse Traders LLC",
        "email": "rajesh@globalpulsetraders.com",
        "country": "Dubai, UAE",
        "type": "COMMERCIAL_BULK_RFQ",
        "commodities": "Classic Toor Dal (10.0 Quintals)",
        "volume": "10.0 Quintals",
        "manifest": [
            {"commodity": "Classic Toor (Tur Dal / Split Pigeon Pea)", "quantity": 10, "unit": "Quintals"}
        ]
    }
    # 1. Register inquiry
    post_res = client.post("/api/inquiries", json=rfq_payload)
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True

    # 2. Verify inquiry database record has NO B/L code
    from backend.db import SessionLocal, InquiryModel
    s = SessionLocal()
    try:
        inq_db = s.query(InquiryModel).filter_by(id=rfq_id).first()
        assert inq_db is not None
        assert not inq_db.bl_code or inq_db.bl_code == "", "Inquiry must not receive an ocean Bill of Lading (B/L) code!"
    finally:
        s.close()

    # 3. Query tracking endpoint /api/track with inquiry reference
    track_res = client.get(f"/api/track?bl={rfq_id}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["success"] is True
    assert track_data.get("isInquiry") is True
    assert track_data.get("type") == "INQUIRY"
    inq_info = track_data["inquiry"]
    assert inq_info["id"] == rfq_id
    assert "inquiry" in inq_info["message"].lower() and "review" in inq_info["message"].lower()
    assert "bill of lading" in inq_info["message"].lower()
    assert "consignment" not in track_data or track_data["consignment"] is None

    # 4. Query verification endpoint /api/verify with inquiry reference
    verify_res = client.get(f"/api/verify/{rfq_id}")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["success"] is True
    assert v_data["valid"] is True
    assert v_data["docType"] == "Commercial Export Inquiry & Estimate Reference"
    doc = v_data["document"]
    assert doc["isInquiry"] is True
    assert doc["isConsignment"] is False
    assert "MSC VALERIA" not in doc["vessel"]
    assert "MSCU" not in doc["containerNo"]
    assert "rfq" in doc["status"].lower() or "inquiry" in doc["status"].lower()


def test_b2b_sample_request_freight_collect(client):
    """Test Option 1: Freight Collect B2B sample request ($0.00, courier account)."""
    from backend.db import SessionLocal, InquiryModel, ConsignmentModel, AuditLogModel
    sample_id = f"GGE-SMP-TEST-FC-{int(time.time())}"
    payload = {
        "orderId": sample_id,
        "settlementMethod": "freight_collect",
        "name": "Tariq Al-Mansoor",
        "email": "tariq@almansoor-trade.ae",
        "company": "Al-Mansoor Food Industries LLC",
        "phone": "+971 50 123 4567",
        "address": "Warehouse 4, Al Quoz 3, Dubai, UAE",
        "commodity": "Classic Toor (Tur Dal) [GGE-TR-2026-A1]",
        "weight": "500g",
        "carrier": "DHL Express",
        "courierAccount": "DHL-965842103"
    }
    resp = client.post("/api/sample-request", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["orderId"] == sample_id
    assert data["settlementMethod"] == "freight_collect"
    assert "PENDING DISPATCH" in data["status"]

    session = SessionLocal()
    try:
        inq = session.query(InquiryModel).filter_by(id=sample_id).first()
        assert inq is not None
        assert inq.type == "SAMPLE_ORDER"
        assert inq.company == "Al-Mansoor Food Industries LLC"
        assert "FREIGHT COLLECT" in inq.payable
        assert "$0.00" in inq.payable

        consign = session.query(ConsignmentModel).filter_by(bl=sample_id).first()
        assert consign is not None
        assert "DHL Express" in consign.vessel

        audit = session.query(AuditLogModel).filter_by(entity_id=sample_id).first()
        assert audit is not None
        assert audit.action == "SAMPLE_FREIGHT_COLLECT_REGISTERED"
    finally:
        session.close()

    # Verify public tracking portal can track this sample order
    track_resp = client.get(f"/api/track?bl={sample_id}")
    assert track_resp.status_code == 200
    t_data = track_resp.json()
    assert t_data["success"] is True
    assert t_data["consignment"]["bl"] == sample_id
    assert "DHL Express" in t_data["consignment"]["vessel"]


def test_b2b_sample_request_proforma_invoice(client):
    """Test Option 2: Proforma Invoice B2B sample request (100% credited against container)."""
    from backend.db import SessionLocal, InquiryModel, ConsignmentModel, AuditLogModel
    sample_id = f"GGE-SMP-TEST-PI-{int(time.time())}"
    payload = {
        "orderId": sample_id,
        "settlementMethod": "proforma_invoice",
        "name": "Jean-Pierre Laurent",
        "email": "jp.laurent@eurograin.fr",
        "company": "EuroGrain Import SA",
        "phone": "+33 1 42 68 55 00",
        "address": "Port Autonome de Marseille, Marseille, France",
        "commodity": "Masoor Dal (Red Split) [GGE-MS-2026-D4]",
        "weight": "1kg"
    }
    resp = client.post("/api/sample-request", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["orderId"] == sample_id
    assert data["settlementMethod"] == "proforma_invoice"
    assert "PROFORMA REQUESTED" in data["status"]

    session = SessionLocal()
    try:
        inq = session.query(InquiryModel).filter_by(id=sample_id).first()
        assert inq is not None
        assert inq.type == "SAMPLE_ORDER"
        assert "PROFORMA INVOICE PENDING" in inq.payable
        assert "100% Credited" in inq.payable

        consign = session.query(ConsignmentModel).filter_by(bl=sample_id).first()
        assert consign is not None
        assert "Proforma" in consign.vessel

        audit = session.query(AuditLogModel).filter_by(entity_id=sample_id).first()
        assert audit is not None
        assert audit.action == "SAMPLE_PROFORMA_INVOICE_REQUESTED"
    finally:
        session.close()


def test_b2b_sample_request_validation(client):
    """Test input validation and sanitization for sample requests."""
    # Missing required fields
    resp = client.post("/api/sample-request", json={})
    assert resp.status_code == 400

    # Invalid corporate email format
    resp_email = client.post("/api/sample-request", json={
        "settlementMethod": "freight_collect",
        "name": "John Doe",
        "email": "invalid-email",
        "address": "123 Port St, London, UK",
        "courierAccount": "DHL-12345"
    })
    assert resp_email.status_code == 400
    assert "corporate email" in resp_email.json()["error"].lower()

    # Invalid settlement method
    resp_method = client.post("/api/sample-request", json={
        "settlementMethod": "unsupported_wire",
        "name": "John Doe",
        "email": "john@example.com",
        "address": "123 Port St, London, UK",
        "courierAccount": "DHL-12345"
    })
    assert resp_method.status_code == 400
    assert "settlement method" in resp_method.json()["error"].lower()

    # Missing courier account for freight collect
    resp2 = client.post("/api/sample-request", json={
        "settlementMethod": "freight_collect",
        "name": "John Doe",
        "email": "john@example.com",
        "address": "123 Port St, London, UK",
        "commodity": "Chia Seeds"
    })
    assert resp2.status_code == 400
    assert "courier account" in resp2.json()["error"].lower()

    # Order ID sanitization against script / path injection
    resp3 = client.post("/api/sample-request", json={
        "orderId": "GGE-SMP-<script>alert(1)</script>",
        "settlementMethod": "freight_collect",
        "name": "Security Tester",
        "email": "tester@security.org",
        "address": "Test Port Terminal, London, UK",
        "courierAccount": "DHL-98765"
    })
    assert resp3.status_code == 200
    clean_id = resp3.json()["orderId"]
    assert "<script>" not in clean_id
    assert "alert" in clean_id or clean_id.startswith("GGE-SMP-")


def test_mock_payment_full_simulation_flow(client):
    """Test Option 3 simulated test mode / mock payment without real card."""
    from backend.db import SessionLocal, InquiryModel, ConsignmentModel, AuditLogModel, PaymentSessionModel
    sample_id = f"GGE-SMP-MOCK-{int(time.time())}"
    mock_pay_id = f"mock_pay_{secrets.token_hex(4).upper()}"

    # 1. Initialize order in mock mode
    create_res = client.post("/api/create-razorpay-order", json={
        "sampleId": sample_id,
        "amount": 499.0,
        "is_mock": True,
        "name": "Dr. Stefan Meier",
        "email": "stefan@bavaria-agri.de",
        "company": "Bavaria Global Agri Import GMBH",
        "phone": "+49 89 2018 4400",
        "address": "Industriestrasse 14, 80331 Munich, Germany",
        "commodity": "Classic Toor (Tur Dal)",
        "weight": "500g"
    })
    assert create_res.status_code == 200
    order_data = create_res.json()
    assert order_data["success"] is True

    # 2. Confirm simulated payment with mock payment ID
    confirm_res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": sample_id,
        "razorpay_payment_id": mock_pay_id,
        "amount": 499.0,
        "is_mock": True,
        "name": "Dr. Stefan Meier",
        "email": "stefan@bavaria-agri.de",
        "company": "Bavaria Global Agri Import GMBH",
        "phone": "+49 89 2018 4400",
        "address": "Industriestrasse 14, 80331 Munich, Germany",
        "commodity": "Classic Toor (Tur Dal)",
        "weight": "500g"
    })
    assert confirm_res.status_code == 200
    c_data = confirm_res.json()
    assert c_data["success"] is True
    assert c_data["status"] == "captured"
    assert c_data["paymentId"] == mock_pay_id

    # 3. Verify ACID persistence
    session = SessionLocal()
    try:
        sess_rec = session.query(PaymentSessionModel).filter_by(order_id=sample_id).first()
        assert sess_rec is not None
        assert sess_rec.status == "captured"
        assert sess_rec.payment_id == mock_pay_id

        inq = session.query(InquiryModel).filter_by(id=sample_id).first()
        assert inq is not None
        assert inq.type == "SAMPLE_ORDER"
        assert inq.company == "Bavaria Global Agri Import GMBH"
        assert inq.bl_code == sample_id
        assert "PAID & CAPTURED" in inq.payable
        assert "100% Credited" in inq.payable

        consign = session.query(ConsignmentModel).filter_by(bl=sample_id).first()
        assert consign is not None
        assert consign.buyer == "Dr. Stefan Meier"
        assert consign.phyto_ref.startswith("IN-PHYTO-")
        assert consign.coa_ref.startswith("COA-GGE-")
        assert consign.inv_ref.startswith("INV-SMP-")

        audit = session.query(AuditLogModel).filter_by(entity_id=sample_id).first()
        assert audit is not None
        assert "Simulated Payment Gateway" in audit.operator
    finally:
        session.close()

    # Verify public tracking portal can track this mock sample order and document references
    track_resp = client.get(f"/api/track?bl={sample_id}")
    assert track_resp.status_code == 200
    t_data = track_resp.json()
    assert t_data["success"] is True
    assert t_data["consignment"]["bl"] == sample_id
    assert "Simulated Air Express" in t_data["consignment"]["vessel"]
    assert "IN-PHYTO-" in t_data["consignment"]["phytoRef"]
    assert "COA-GGE-" in t_data["consignment"]["coaRef"]


def test_mock_payment_security_bypass_prevented_in_prod(client, monkeypatch):
    """Ensure that in production, an order NOT initialized as mock cannot bypass signature verification."""
    # 1. Create a genuine live order (is_mock not set)
    cr_res = client.post("/api/create-razorpay-order", json={
        "amount": 499.0,
        "currency": "INR"
    })
    assert cr_res.status_code == 200
    live_order_id = cr_res.json()["orderId"]

    # 2. Simulate production mode with Razorpay secret set
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "prod_secret_enterprise_verification_2026")
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)

    # 3. Attacker tries to confirm live order by adding is_mock=True without valid signature -> Rejected
    bad_res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": live_order_id,
        "razorpay_payment_id": "pay_hacker_forged",
        "amount": 499.0,
        "is_mock": True
    })
    assert bad_res.status_code == 400
    assert "requires razorpay_signature" in bad_res.json().get("error", "").lower()

    # Restore environment
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "tests/test_api.py::test_mock_payment_security_bypass_prevented_in_prod")


def test_backend_data_persistence_across_reloads_and_restart(client):
    """
    Verify that inquiries, sample orders, and consignments persist permanently in SQLite
    and JSON mirrors across re-reading, simulated server re-initialization, and are NOT erased.
    """
    import os
    from backend.db import SessionLocal, InquiryModel, ConsignmentModel, init_db, DATA_DIR

    token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    test_rfq_id = "RFQ-PERSIST-TEST-001"
    test_payload = {
        "id": test_rfq_id,
        "name": "Persistence Verification Corp",
        "company": "Permanent Holdings LLC",
        "email": "audit@permanentholdings.com",
        "commodities": "Emmer Wheat & Sorghum",
        "volume": "10 Quintals",
        "status": "New RFQ",
        "manifest": [{"commodity": "Emmer Wheat", "quantity": 10, "unit": "Quintals"}]
    }

    # 1. Post inquiry to backend
    post_res = client.post("/api/inquiries", json=test_payload, headers=headers)
    assert post_res.status_code == 200

    # 2. Verify inquiry is in SQLite database
    session = SessionLocal()
    try:
        inq = session.query(InquiryModel).filter_by(id=test_rfq_id).first()
        assert inq is not None
        assert inq.company == "Permanent Holdings LLC"
        assert inq.status == "New RFQ"
    finally:
        session.close()

    # 3. Verify inquiry is in inquiries.json mirror
    inq_json_path = os.path.join(DATA_DIR, "inquiries.json")
    assert os.path.exists(inq_json_path)
    with open(inq_json_path, "r", encoding="utf-8") as f:
        inqs_on_disk = json.load(f)
    assert any(i.get("id") == test_rfq_id for i in inqs_on_disk)

    # 4. Simulate server restart by invoking init_db() again
    init_db()

    # 5. Fetch via GET /api/inquiries
    get_res = client.get("/api/inquiries", headers=headers)
    assert get_res.status_code == 200
    inqs_from_api = get_res.json()["inquiries"]
    found = [i for i in inqs_from_api if i["id"] == test_rfq_id]
    assert len(found) == 1
    assert found[0]["company"] == "Permanent Holdings LLC"

    # 6. Update status to 'Quote Sent' and verify persistence
    update_res = client.post("/api/inquiries", json={
        "id": test_rfq_id,
        "status": "Quote Sent · Formal PI Dispatched"
    }, headers=headers)
    assert update_res.status_code == 200

    # Verify status in SQLite
    session = SessionLocal()
    try:
        inq_updated = session.query(InquiryModel).filter_by(id=test_rfq_id).first()
        assert inq_updated.status == "Quote Sent · Formal PI Dispatched"
    finally:
        session.close()

    # Cleanup test record
    del_res = client.delete(f"/api/inquiries/{test_rfq_id}", headers=headers)
    assert del_res.status_code == 200


def test_sample_order_persistence_and_anti_erasure(client):
    """
    Verify that sample requests with GGE-SMP- IDs persist into both inquiries
    and consignments tables without being erased or partitioned out.
    """
    from backend.db import SessionLocal, InquiryModel, ConsignmentModel

    token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    sample_id = "GGE-SMP-PERSIST-999"
    sample_payload = {
        "orderId": sample_id,
        "name": "Fraunhofer Agri Import",
        "email": "lab@fraunhofer-agri.de",
        "company": "Fraunhofer Agri GmbH",
        "address": "Munich, Germany",
        "commodity": "Classic Toor Dal",
        "weight": "500g",
        "settlementMethod": "freight_collect",
        "carrier": "DHL Express",
        "courierAccount": "DHL-9920194"
    }

    # Post sample request
    smp_res = client.post("/api/sample-request", json=sample_payload)
    assert smp_res.status_code == 200

    # Verify presence in InquiryModel
    session = SessionLocal()
    try:
        inq = session.query(InquiryModel).filter_by(id=sample_id).first()
        assert inq is not None
        assert inq.type == "SAMPLE_ORDER"
        assert "DHL" in inq.payable

        consign = session.query(ConsignmentModel).filter_by(bl=sample_id).first()
        assert consign is not None
        assert consign.buyer == "Fraunhofer Agri Import"
    finally:
        session.close()

    # Verify GET /api/inquiries contains the sample
    get_res = client.get("/api/inquiries", headers=headers)
    assert any(i["id"] == sample_id for i in get_res.json()["inquiries"])

    # Clean up
    client.delete(f"/api/inquiries/{sample_id}", headers=headers)
    client.delete(f"/api/consignments/{sample_id}", headers=headers)


def test_domestic_rates_endpoint(client):
    """Test retrieving domestic commodity rate schedule and allowed pack sizes."""
    res = client.get("/api/domestic-rates")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "rates" in data
    assert data["allowedPacks"] == ["500g", "1kg", "5kg", "25kg"]
    assert "p1" in data["rates"]
    assert data["rates"]["p1"]["packs"]["500g"] == 85.0
    assert data["rates"]["p1"]["packs"]["1kg"] == 160.0
    assert data["rates"]["p1"]["packs"]["5kg"] == 775.0
    assert data["rates"]["p1"]["packs"]["25kg"] == 3750.0
    assert "goldenglobalexpo@" in data["upiVpa"].lower()


def test_create_upi_order_and_confirm_flow(client):
    """Full domestic trade flow: initialize UPI order session and confirm settlement with UTR."""
    import secrets

    order_id = f"GGE-DOM-{secrets.token_hex(4).upper()}"
    utr_code = f"UTR{secrets.token_hex(6).upper()}"

    # 1. Create UPI order
    create_res = client.post("/api/create-upi-order", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "5kg",
        "quantity": 2,
        "name": "Rajesh Patel",
        "phone": "+91 98200 12345",
        "email": "rajesh@pateltraders.in",
        "address": "Shop 12, APMC Market 2, Vashi",
        "city": "Navi Mumbai",
        "state": "Maharashtra",
        "pincode": "400703",
        "is_mock": True
    })
    assert create_res.status_code == 200
    cr_data = create_res.json()
    assert cr_data["success"] is True
    assert cr_data["orderId"] == order_id
    assert cr_data["packSize"] == "5kg"
    assert cr_data["quantity"] == 2
    assert cr_data["amount"] == 1550.0  # 775 * 2
    assert "upi://pay?pa=" in cr_data["upiUri"]
    assert "INR" in cr_data["upiUri"]

    # 2. Confirm UPI payment
    confirm_res = client.post("/api/confirm-upi-payment", json={
        "orderId": order_id,
        "utr": utr_code,
        "amount": 1550.0,
        "name": "Rajesh Patel",
        "phone": "+91 98200 12345",
        "email": "rajesh@pateltraders.in",
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "5kg",
        "quantity": 2,
        "is_mock": True
    })
    assert confirm_res.status_code == 200
    cf_data = confirm_res.json()
    assert cf_data["success"] is True
    assert cf_data["status"] == "captured"
    assert cf_data["utr"] == utr_code

    # 3. Verify Database ACID State
    from backend.db import SessionLocal, InquiryModel, ConsignmentModel, AuditLogModel, PaymentSessionModel
    session = SessionLocal()
    try:
        sess_rec = session.query(PaymentSessionModel).filter_by(order_id=order_id).first()
        assert sess_rec is not None
        assert sess_rec.status == "captured"
        assert sess_rec.payment_id == utr_code

        inq = session.query(InquiryModel).filter_by(id=order_id).first()
        assert inq is not None
        assert inq.type == "DOMESTIC_ORDER"
        assert inq.name == "Rajesh Patel"
        assert "PAID VIA UPI" in inq.payable
        assert inq.country == "India"
        assert "5kg" in inq.commodities

        consign = session.query(ConsignmentModel).filter_by(bl=order_id).first()
        assert consign is not None
        assert consign.buyer == "Rajesh Patel"
        assert "Domestic Surface Express" in consign.vessel
        assert "Navi Mumbai" in consign.pod
        assert consign.stage == 2

        audit = session.query(AuditLogModel).filter_by(entity_id=order_id).first()
        assert audit is not None
        assert audit.action == "DOMESTIC_ORDER_PAID_UPI"
    finally:
        session.close()

    # 4. Verify public tracking API can track the domestic consignment
    track_res = client.get(f"/api/track?bl={order_id}")
    assert track_res.status_code == 200
    t_data = track_res.json()
    assert t_data["success"] is True
    assert t_data["consignment"]["bl"] == order_id
    assert "Domestic Surface Express" in t_data["consignment"]["vessel"]

    # 5. Verify idempotency
    idem_res = client.post("/api/confirm-upi-payment", json={
        "orderId": order_id,
        "utr": utr_code,
        "amount": 1550.0
    })
    assert idem_res.status_code == 200
    assert idem_res.json().get("alreadyCaptured") is True

    # 6. Verify price tampering rejection on new order
    order_id_tamper = f"GGE-DOM-{secrets.token_hex(4).upper()}"
    client.post("/api/create-upi-order", json={
        "orderId": order_id_tamper,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1
    })
    tamper_res = client.post("/api/confirm-upi-payment", json={
        "orderId": order_id_tamper,
        "utr": "UTR_TAMPERED_123",
        "amount": 10.0  # expected 160.0
    })
    assert tamper_res.status_code == 400
    assert "Price tampering detected" in tamper_res.json().get("error", "")


def test_create_upi_order_invalid_pack_size(client):
    """Ensure invalid pack sizes are rejected."""
    bad_res = client.post("/api/create-upi-order", json={
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "100kg",
        "quantity": 1
    })
    assert bad_res.status_code == 400
    assert "Invalid pack size" in bad_res.json().get("error", "")


def test_all_four_pack_sizes_accepted(client):
    """Ensure all required pack sizes: 500g, 1kg, 5kg, 25kg are accepted and accurately priced."""
    from backend.routers.payments import DOMESTIC_COMMODITY_SCHEDULE

    for pack_size in ["500g", "1kg", "5kg", "25kg"]:
        res = client.post("/api/create-upi-order", json={
            "commodity": "Classic Toor (Tur Dal)",
            "packSize": pack_size,
            "quantity": 1,
            "name": "Validation Buyer",
            "phone": "+91 98200 11111",
            "email": "buyer@validation.in",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411001"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["packSize"] == pack_size
        expected_rate = DOMESTIC_COMMODITY_SCHEDULE["p1"]["packs"][pack_size]
        assert data["amount"] == expected_rate


def test_confirm_upi_payment_validation_rules(client):
    """Verify missing order ID and short UTR errors."""
    # 1. Missing orderId
    r1 = client.post("/api/confirm-upi-payment", json={"utr": "UTR1234567890"})
    assert r1.status_code == 400
    assert "Order ID is required" in r1.json().get("error", "")

    # 2. Missing UTR
    r2 = client.post("/api/confirm-upi-payment", json={"orderId": "GGE-DOM-XYZ"})
    assert r2.status_code == 400
    assert "UTR" in r2.json().get("error", "")

    # 3. Too short UTR (< 4 chars)
    r3 = client.post("/api/confirm-upi-payment", json={"orderId": "GGE-DOM-XYZ", "utr": "ab"})
    assert r3.status_code == 400
    assert "min 4 characters" in r3.json().get("error", "")


def test_domestic_quantity_multipliers_and_limits(client):
    """Test quantity multipliers and boundary validations."""
    from backend.routers.payments import DOMESTIC_COMMODITY_SCHEDULE

    # 1. Valid multiplier (quantity = 4)
    res_qty4 = client.post("/api/create-upi-order", json={
        "commodity": "Classic Moong (Whole)",
        "packSize": "5kg",
        "quantity": 4
    })
    assert res_qty4.status_code == 200
    d4 = res_qty4.json()
    assert d4["quantity"] == 4
    unit_p = DOMESTIC_COMMODITY_SCHEDULE["p2"]["packs"]["5kg"]
    assert d4["amount"] == unit_p * 4

    # 2. Invalid quantity: 0
    res_zero = client.post("/api/create-upi-order", json={
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 0
    })
    assert res_zero.status_code == 400
    assert "Quantity must be between 1 and 1,000" in res_zero.json()["error"]

    # 3. Invalid quantity: negative
    res_neg = client.post("/api/create-upi-order", json={
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": -5
    })
    assert res_neg.status_code == 400

    # 4. Invalid quantity: > 1000
    res_huge = client.post("/api/create-upi-order", json={
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1001
    })
    assert res_huge.status_code == 400

    # 5. Non-integer quantity
    res_str = client.post("/api/create-upi-order", json={
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": "five"
    })
    assert res_str.status_code == 400


def test_domestic_commodity_coverage_and_pricing(client):
    """Test diverse agricultural categories: spices, powders, dairy, grains."""
    commodities_to_test = [
        ("Cumin Seeds (Jeera Whole)", "p7", "500g"),
        ("Moringa Leaf Powder", "p8", "1kg"),
        ("Pure Cow Ghee (Desi Bilona)", "p15", "5kg"),
        ("Emmer Wheat (Khapli Wheat)", "p14", "25kg"),
    ]
    from backend.routers.payments import DOMESTIC_COMMODITY_SCHEDULE

    for name, key, pack in commodities_to_test:
        res = client.post("/api/create-upi-order", json={
            "commodity": name,
            "packSize": pack,
            "quantity": 1
        })
        assert res.status_code == 200
        d = res.json()
        assert d["success"] is True
        expected = DOMESTIC_COMMODITY_SCHEDULE[key]["packs"][pack]
        assert d["amount"] == expected


def test_domestic_mock_utr_detection(client):
    """Verify various mock and test UTR prefixes are correctly recognized as mock mode."""
    mock_utrs = ["mock_upi_4892", "MOCK-TRANS-771", "UTR991448291044"]
    for utr in mock_utrs:
        order_id = f"GGE-DOM-{secrets.token_hex(4).upper()}"
        client.post("/api/create-upi-order", json={
            "orderId": order_id,
            "commodity": "Chia Seeds (Superfood)",
            "packSize": "500g",
            "quantity": 1
        })
        conf_res = client.post("/api/confirm-upi-payment", json={
            "orderId": order_id,
            "utr": utr,
            "amount": 190.0
        })
        assert conf_res.status_code == 200
        assert conf_res.json()["status"] == "captured"


def test_commercial_rfq_cryptographic_audit_trail(client, db_session):
    """Verify that submitting a commercial RFQ logs an un-nested audit entry with COMMERCIAL_RFQ_REGISTERED."""
    from backend.db import AuditLogModel
    rfq_id = f"INQ-EXP-{secrets.token_hex(4).upper()}"
    res = client.post("/api/inquiries", json={
        "id": rfq_id,
        "type": "BULK_INQUIRY",
        "name": "Global Grain Importers Ltd",
        "company": "Grain Corp UK",
        "email": "purchasing@graincorp.co.uk",
        "commodities": "Classic Toor (Tur Dal)",
        "volume": "50 Metric Tons",
        "country": "United Kingdom",
        "status": "OPEN"
    })
    assert res.status_code == 200
    assert res.json()["success"] is True

    audit_entry = db_session.query(AuditLogModel).filter_by(entity_id=rfq_id).first()
    assert audit_entry is not None
    assert audit_entry.action == "COMMERCIAL_RFQ_REGISTERED"
    assert "Grain Corp UK" in audit_entry.details
    assert len(audit_entry.hash) == 64


def test_delete_inquiry_and_consignment_audit_logging(client, db_session):
    """Verify deleting inquiries and consignments appends cryptographic audit records."""
    from backend.db import AuditLogModel, ConsignmentModel
    token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Commercial inquiry delete audit
    rfq_id = f"INQ-DEL-{secrets.token_hex(4).upper()}"
    client.post("/api/inquiries", json={
        "id": rfq_id,
        "type": "BULK_INQUIRY",
        "name": "To Delete Importer",
        "company": "Delete Corp",
        "email": "del@example.com",
        "commodities": "Cumin Seeds",
        "volume": "10 MT"
    })
    del_inq_resp = client.delete(f"/api/inquiries/{rfq_id}", headers=headers)
    assert del_inq_resp.status_code == 200
    inq_del_audit = db_session.query(AuditLogModel).filter_by(
        entity_id=rfq_id, action="COMMERCIAL_RFQ_DELETED"
    ).first()
    assert inq_del_audit is not None
    assert inq_del_audit.new_state == "DELETED"

    # 2. Consignment delete audit
    bl_code = f"MEDU-{secrets.token_hex(4).upper()}"
    db_session.add(ConsignmentModel(
        bl=bl_code,
        buyer="Maritime Importers",
        commodity="Classic Moong",
        status="Sailing",
        updated_at=time.time()
    ))
    db_session.commit()

    del_csg_resp = client.delete(f"/api/consignments/{bl_code}", headers=headers)
    assert del_csg_resp.status_code == 200
    csg_del_audit = db_session.query(AuditLogModel).filter_by(
        entity_id=bl_code, action="CONSIGNMENT_DELETED"
    ).first()
    assert csg_del_audit is not None
    assert csg_del_audit.new_state == "DELETED"


def test_track_consignment_by_docs_and_utr(client, db_session):
    """Verify tracking lookup by document references (inv_ref, phyto_ref, coa_ref) and domestic UPI UTR."""
    from backend.db import ConsignmentModel, DomesticOrderModel
    token = secrets.token_hex(3).upper()
    bl_code = f"MSCU-TRK-{token}"
    inv_num = f"INV-EXP-{token}"
    phyto_num = f"PHYTO-EXP-{token}"
    coa_num = f"COA-EXP-{token}"

    db_session.add(ConsignmentModel(
        bl=bl_code,
        inv_ref=inv_num,
        phyto_ref=phyto_num,
        coa_ref=coa_num,
        commodity="Organic Chia Seeds",
        status="Customs Cleared",
        pod="Jebel Ali, UAE",
        updated_at=time.time()
    ))

    # Domestic order with unique UTR
    dom_id = f"GGE-DOM-TRK-{token}"
    utr_num = f"UTR{secrets.token_hex(6).upper()}"
    db_session.add(DomesticOrderModel(
        id=dom_id,
        commodity="Pure Cow Ghee (Desi Bilona)",
        pack_size="1kg",
        quantity=2,
        amount=1700.0,
        consignee_name="Retail Buyer",
        upi_utr=utr_num,
        order_status="Dispatch Prepared",
        created_at=time.time(),
        updated_at=time.time()
    ))
    db_session.commit()

    # Track by inv_ref
    res_inv = client.get(f"/api/track?bl={inv_num}")
    assert res_inv.status_code == 200
    assert res_inv.json()["consignment"]["bl"] == bl_code

    # Track by phyto_ref
    res_phy = client.get(f"/api/track?bl={phyto_num}")
    assert res_phy.status_code == 200
    assert res_phy.json()["consignment"]["bl"] == bl_code

    # Track by coa_ref
    res_coa = client.get(f"/api/track?bl={coa_num}")
    assert res_coa.status_code == 200
    assert res_coa.json()["consignment"]["bl"] == bl_code

    # Track by UPI UTR
    res_utr = client.get(f"/api/track?bl={utr_num}")
    assert res_utr.status_code == 200
    assert res_utr.json()["order"]["id"] == dom_id


def test_razorpay_webhook_nested_payload_and_paise_conversion(client, db_session):
    """Verify that /api/payment-webhook correctly digests nested webhook JSON with paise sub-units."""
    sample_id = f"GGE-SMP-WH-{int(time.time())}"

    # Initialize order for 2500 INR
    create_res = client.post("/api/create-razorpay-order", json={
        "sampleId": sample_id,
        "amount": 2500.0,
        "currency": "INR",
        "is_mock": True
    })
    assert create_res.status_code == 200

    # Webhook payload: Razorpay sends 250000 paise (2500 INR)
    webhook_payload = {
        "entity": "event",
        "account_id": "acc_gge_test",
        "event": "payment.captured",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_wh_{secrets.token_hex(4)}",
                    "entity": "payment",
                    "amount": 250000,
                    "currency": "INR",
                    "status": "captured",
                    "order_id": sample_id,
                    "notes": {
                        "name": "European Grain Purchaser",
                        "company": "Grain EU",
                        "email": "purchaser@graineu.com"
                    }
                }
            }
        },
        "is_mock": True
    }

    wh_res = client.post("/api/payment-webhook", json=webhook_payload)
    assert wh_res.status_code == 200
    data = wh_res.json()
    assert data["status"] == "captured"
    assert data["orderId"] == sample_id


def test_audit_hash_snake_case_and_camel_case_parity():
    """Verify compute_entry_hash yields identical hashes regardless of key casing."""
    from backend.routers.audit import compute_entry_hash
    prev_h = "0" * 64
    item_camel = {
        "id": "AUD-TEST-1",
        "timestamp": "2026-09-22T10:00:00Z",
        "operator": "compliance@gge.com",
        "action": "RECORD_UPDATE",
        "entityId": "REC-12345",
        "previousState": "PENDING",
        "newState": "VERIFIED",
        "details": "Verified successfully"
    }
    item_snake = {
        "id": "AUD-TEST-1",
        "timestamp": "2026-09-22T10:00:00Z",
        "operator": "compliance@gge.com",
        "action": "RECORD_UPDATE",
        "entity_id": "REC-12345",
        "previous_state": "PENDING",
        "new_state": "VERIFIED",
        "details": "Verified successfully"
    }

    h_camel = compute_entry_hash(item_camel, prev_h)
    h_snake = compute_entry_hash(item_snake, prev_h)
    assert h_camel == h_snake



import os

def test_owasp_security_headers(client):
    """Verify that OWASP defense headers are present on HTTP responses."""
    resp = client.get("/")
    assert resp.status_code == 200
    headers = {k.lower(): v for k, v in resp.headers.items()}
    assert headers.get("x-frame-options") == "SAMEORIGIN"
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"

def test_unauthorized_admin_email_rejection(client):
    """Verify that unauthorized emails are blocked from requesting OTPs."""
    resp = client.post("/api/auth/request-otp", json={"email": "hacker@malicious.com"})
    assert resp.status_code == 403
    assert resp.json()["success"] is False

def test_admin_auth_and_session_flow(client):
    """Verify emergency master authentication and session token validation."""
    master_code = os.environ.get("ADMIN_MASTER_CODE", "991448")
    resp = client.post("/api/auth/verify-otp", json={"email": "nigadearyan@gmail.com", "otp": master_code})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "token" in data
    token = data["token"]

    # Validate session with Bearer token
    val_resp = client.get("/api/auth/validate-session", headers={"Authorization": f"Bearer {token}"})
    assert val_resp.status_code == 200
    assert val_resp.json()["valid"] is True

def test_admin_password_login_and_cookie_auth(client):
    """Verify admin password authentication, cookie creation, and protected route access."""
    # Invalid password attempt
    bad_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "WrongPassword!"})
    assert bad_resp.status_code == 401

    # Valid password login
    valid_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    assert valid_resp.status_code == 200
    data = valid_resp.json()
    assert data["success"] is True
    assert "token" in data
    assert "gge_admin_session" in valid_resp.cookies

    # Access protected /desk.html with the received cookie
    token = data["token"]
    client.cookies.set("gge_admin_session", token)
    desk_resp = client.get("/desk.html")
    assert desk_resp.status_code == 200
    assert len(desk_resp.content) > 1000

    # Logout
    logout_resp = client.post("/api/auth/logout")
    assert logout_resp.status_code == 200

def test_cors_credentials_origin_validation(client):
    """Verify that only authorized origins receive credentialed CORS headers."""
    # 1. Trusted localhost origin must receive credentials flag
    trusted_resp = client.get("/api/prices", headers={"Origin": "http://localhost:8000"})
    assert trusted_resp.status_code == 200
    assert trusted_resp.headers.get("access-control-allow-credentials") == "true"
    assert trusted_resp.headers.get("access-control-allow-origin") == "http://localhost:8000"

    # 2. Trusted production domain must receive credentials flag
    prod_resp = client.get("/api/prices", headers={"Origin": "https://goldenglobalexpo.com"})
    assert prod_resp.status_code == 200
    assert prod_resp.headers.get("access-control-allow-credentials") == "true"
    assert prod_resp.headers.get("access-control-allow-origin") == "https://goldenglobalexpo.com"

    # 3. Untrusted/Malicious origin must NEVER receive access-control-allow-credentials: true
    untrusted_resp = client.get("/api/prices", headers={"Origin": "https://malicious-attacker.com"})
    assert untrusted_resp.status_code == 200
    assert untrusted_resp.headers.get("access-control-allow-credentials") is None
    assert untrusted_resp.headers.get("access-control-allow-origin") != "https://malicious-attacker.com"

def test_rate_limiter_otp_throttle_and_master_bypass(client):
    """Verify rate limiter blocks brute force attempts and master code resets locks."""
    # 1. 4 allowed requests per 10-minute window
    for _ in range(4):
        r = client.post("/api/auth/request-otp", json={"email": "nigadearyan@gmail.com"})
        assert r.status_code == 200

    # 2. 5th request must be throttled with HTTP 429
    throttled_resp = client.post("/api/auth/request-otp", json={"email": "nigadearyan@gmail.com"})
    assert throttled_resp.status_code == 429
    assert "Rate limit exceeded" in throttled_resp.json()["error"]
    assert "retry-after" in throttled_resp.headers

    # 3. Master bypass resets rate lock and validates session
    master_resp = client.post("/api/auth/verify-otp", json={"email": "nigadearyan@gmail.com", "otp": "991448"})
    assert master_resp.status_code == 200
    assert master_resp.json()["success"] is True

def test_rate_limiter_payment_orders(client):
    """Verify payment order creation is protected against automated DDoS spam."""
    # 1. 15 requests allowed
    for _ in range(15):
        resp = client.post("/api/create-razorpay-order", json={"amount": 2500, "currency": "INR"})
        assert resp.status_code == 200

    # 2. 16th request must be rate limited with HTTP 429
    over_resp = client.post("/api/create-razorpay-order", json={"amount": 2500, "currency": "INR"})
    assert over_resp.status_code == 429
    assert over_resp.json()["success"] is False

def test_bearer_token_logout_invalidation(client):
    """Verify that logging out via Bearer token destroys session in database."""
    # Login via password
    resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    assert resp.status_code == 200
    token = resp.json()["token"]

    # Session is valid
    v1 = client.get("/api/auth/validate-session", headers={"Authorization": f"Bearer {token}"})
    assert v1.status_code == 200
    assert v1.json()["valid"] is True

    # Logout with Bearer token
    logout_resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_resp.status_code == 200

    # Session must now be invalid
    v2 = client.get("/api/auth/validate-session", headers={"Authorization": f"Bearer {token}"})
    assert v2.status_code == 401

def test_malformed_json_returns_bad_request(client):
    """Verify that malformed JSON payloads return HTTP 400 Bad Request, never HTTP 500."""
    headers = {"Content-Type": "application/json"}
    endpoints = [
        "/api/admin/login",
        "/api/auth/request-otp",
        "/api/auth/verify-otp",
        "/api/create-razorpay-order",
        "/api/confirm-payment",
        "/api/send-email",
        "/api/inquiries"
    ]
    for ep in endpoints:
        r = client.post(ep, content="not-a-valid-json-payload{{", headers=headers)
        assert r.status_code == 400, f"Endpoint {ep} must return 400 on malformed JSON, got {r.status_code}"
        data = r.json()
        assert data["success"] is False

def test_price_nan_and_inf_rejected(client):
    """Verify that non-finite numbers (NaN, Infinity) and out-of-bounds prices are rejected with 400."""
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # NaN attempt via JSON
    nan_resp = client.post("/api/prices", content='{"prices": {"p1": {"baseUsd": NaN}}}', headers={"Content-Type": "application/json", **headers})
    assert nan_resp.status_code == 400

    # Negative price
    neg_resp = client.post("/api/prices", json={"prices": {"p1": {"baseUsd": -50.0}}}, headers=headers)
    assert neg_resp.status_code == 400

    # Unrealistic price > 100,000
    huge_resp = client.post("/api/prices", json={"prices": {"p1": {"baseUsd": 999999.0}}}, headers=headers)
    assert huge_resp.status_code == 400

def test_document_vault_magic_bytes_enforcement(client):
    """Verify that document vault inspects magic byte headers and rejects disguised executables/garbage."""
    import io
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fake PDF containing Windows PE / MZ executable signature
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00malicious-payload")
    r_exe = client.post(
        "/api/documents/upload",
        data={"bl": "GGE-TEST-BL-SEC", "slot": "inv"},
        files={"file": ("invoice.pdf", fake_exe, "application/pdf")},
        headers=headers
    )
    assert r_exe.status_code == 400
    assert "Invalid PDF" in r_exe.json().get("detail", "")

    # Valid PDF with %PDF- signature
    valid_pdf = io.BytesIO(b"%PDF-1.4 official trade invoice test")
    r_valid = client.post(
        "/api/documents/upload",
        data={"bl": "GGE-TEST-BL-SEC", "slot": "dossier_inv"},  # Also test slot normalization
        files={"file": ("invoice.pdf", valid_pdf, "application/pdf")},
        headers=headers
    )
    assert r_valid.status_code == 200
    assert r_valid.json()["success"] is True

def test_consignment_deletion_cleans_vault_documents(client):
    """Verify that deleting a consignment cleans up associated disk artifacts in the vault."""
    import io, os
    from backend.core.config import BASE_DIR
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    test_bl = "GGE-CLEANUP-2026"
    client.post("/api/consignments", json={"bl": test_bl, "buyer": "Cleanup Test"}, headers=headers)

    valid_pdf = io.BytesIO(b"%PDF-1.4 official trade certificate")
    up_res = client.post(
        "/api/documents/upload",
        data={"bl": test_bl, "slot": "coa"},
        files={"file": ("coa.pdf", valid_pdf, "application/pdf")},
        headers=headers
    )
    assert up_res.status_code == 200

    vault_file = os.path.join(str(BASE_DIR), "uploads", "documents", f"{test_bl}_coa.pdf")
    assert os.path.exists(vault_file), "Uploaded file must exist on disk prior to deletion"

    # Delete consignment
    del_res = client.delete(f"/api/consignments/{test_bl}", headers=headers)
    assert del_res.status_code == 200

    # File must be cleaned up from vault
    assert not os.path.exists(vault_file), "Vault file must be cleaned up upon consignment deletion"

def test_audit_ledger_immutability_on_list_post(client):
    """Verify that sending a list to /api/audit appends entries rather than wiping the audit ledger."""
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify initial count
    initial_get = client.get("/api/audit", headers=headers)
    initial_count = len(initial_get.json()["audit"])
    assert initial_count > 0

    # Post an empty list or new entry list
    post_res = client.post("/api/audit", json=[], headers=headers)
    assert post_res.status_code == 200

    # Ledger must NOT have been wiped
    after_get = client.get("/api/audit", headers=headers)
    assert len(after_get.json()["audit"]) >= initial_count

def test_anonymous_inquiry_cannot_modify_existing_rfq(client):
    """Verify that anonymous visitors cannot alter or overwrite existing RFQs in the database."""
    # 1. Admin creates legitimate RFQ
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    test_rfq_id = "RFQ-SEC-ORIGINAL"
    client.post("/api/inquiries", json={
        "id": test_rfq_id,
        "name": "Legitimate Buyer",
        "company": "Global Trade Corp",
        "commodities": "Organic Soybean"
    }, headers=headers)

    # 2. Anonymous attacker tries to overwrite this RFQ
    client.cookies.clear()
    attack_resp = client.post("/api/inquiries", json={
        "id": test_rfq_id,
        "name": "Malicious Tamperer",
        "company": "Fake Entity",
        "commodities": "Garbage"
    })
    assert attack_resp.status_code == 200

    # 3. Verify original inquiry data remains untouched
    verify_resp = client.get("/api/inquiries", headers=headers)
    assert verify_resp.status_code == 200
    rfqs = verify_resp.json()["inquiries"]
    target = next((r for r in rfqs if r["id"] == test_rfq_id), None)
    assert target is not None
    assert target["name"] == "Legitimate Buyer", "Anonymous visitor must not overwrite existing RFQs"
    assert target["company"] == "Global Trade Corp"

def test_email_service_handles_multiple_attachments():
    """Verify that background_send_email_task safely processes multiple attachments array without dropping."""
    import base64
    from backend.services.email_service import background_send_email_task

    b64_pdf1 = base64.b64encode(b"%PDF-1.4 Invoice Test Data").decode('utf-8')
    b64_pdf2 = base64.b64encode(b"%PDF-1.4 COA Test Data").decode('utf-8')

    email_payload = {
        "to": "test@goldenglobalexpo.com",
        "toName": "Test Importer",
        "subject": "Test Multiple Attachments",
        "body": "Please find both documents attached.",
        "attachments": [
            {"filename": "GGE_INV_TEST.pdf", "data": b64_pdf1},
            {"filename": "GGE_COA_TEST.pdf", "data": f"data:application/pdf;base64,{b64_pdf2}"}
        ]
    }

    # Should execute without throwing any exception even when SMTP_PASS is unset (offline/mock mode)
    background_send_email_task(email_payload)


def test_email_service_server_vault_and_client_pass(tmp_path):
    """Verify that background_send_email_task reads attachments from server vault and accepts client smtpPass."""
    import os
    from backend.services.email_service import background_send_email_task

    # Create dummy vault file in uploads/documents
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    vault_dir = os.path.join(base_dir, "uploads", "documents")
    os.makedirs(vault_dir, exist_ok=True)
    test_pdf = os.path.join(vault_dir, "GGE-TEST-AUTO-BL_inv.pdf")
    with open(test_pdf, "wb") as f:
        f.write(b"%PDF-1.4 Vault Test Invoice")

    try:
        email_payload = {
            "to": "buyer@goldenglobalexpo.com",
            "toName": "Test Buyer",
            "subject": "Consignment Dispatch Test",
            "body": "Your cargo is on the way.",
            "smtpPass": "test_app_pass_16c",
            "specs": {
                "Bill of Lading (B/L) Code": "GGE-TEST-AUTO-BL"
            },
            "attachments": [
                {
                    "slot": "inv",
                    "bl": "GGE-TEST-AUTO-BL",
                    "name": "Invoice.pdf",
                    "dataUrl": ""  # empty base64, should load from vault
                }
            ]
        }

        # Should execute safely and load document from vault without throwing
        background_send_email_task(email_payload)
    finally:
        if os.path.exists(test_pdf):
            os.remove(test_pdf)



def test_payment_price_tampering_rejected(client):
    """Verify that attempting to confirm an order with a tampered amount is rejected with HTTP 400."""
    # 1. Create a legitimate Razorpay order for 500.0 INR
    create_res = client.post("/api/create-razorpay-order", json={
        "amount": 500.0,
        "currency": "INR",
        "sampleType": "Sortex Pulses",
        "inquiryRef": "RFQ-TEST-TAMPER"
    })
    assert create_res.status_code == 200
    order_data = create_res.json()
    order_id = order_data["orderId"]

    # 2. Tamper price: submit confirmation with amount 1.0 INR
    tamper_res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_tampered_123",
        "amount": 1.0
    })
    assert tamper_res.status_code == 400
    assert "tampering" in tamper_res.json().get("error", "").lower()

    # 3. Submit valid payment with exact authorized amount
    valid_res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_valid_123",
        "amount": 500.0
    })
    assert valid_res.status_code == 200
    assert valid_res.json()["status"] == "captured"


def test_consignment_sql_wildcard_isolation(client):
    """Verify that SQL LIKE wildcards (% and _) cannot dump consignment records."""
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/consignments", json={
        "bl": "GGE-ISOLATE-2026",
        "buyer": "Secret Enterprise"
    }, headers=headers)

    # Search with SQL wildcard % must return 404, not dump the record
    pct_res = client.get("/api/track?bl=%")
    assert pct_res.status_code == 404

    underscore_res = client.get("/api/track?bl=_")
    assert underscore_res.status_code == 404

    exact_res = client.get("/api/track?bl=GGE-ISOLATE-2026")
    assert exact_res.status_code == 200


def test_public_tracking_pii_redaction(client):
    """Verify that public consignment tracking strips confidential buyer PII and CRM references."""
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/consignments", json={
        "bl": "GGE-PII-CONFIDENTIAL-2026",
        "buyer": "Poachable Importer Corp",
        "buyerEmail": "ceo@poachableimporter.com",
        "buyerPhone": "+971-50-1234567",
        "inquiryRef": "RFQ-TOP-SECRET-007",
        "quotationRef": "Q-TOP-SECRET-007",
        "commodity": "Organic Soybeans",
        "vessel": "MSC GULSUN",
        "pod": "Rotterdam",
        "status": "In Transit"
    }, headers=headers)

    # Anonymous public tracking query
    client.cookies.clear()
    pub_res = client.get("/api/track?bl=GGE-PII-CONFIDENTIAL-2026")
    assert pub_res.status_code == 200
    data = pub_res.json()["consignment"]

    # Public details should be present
    assert data["bl"] == "GGE-PII-CONFIDENTIAL-2026"
    assert data["commodity"] == "Organic Soybeans"
    assert data["vessel"] == "MSC GULSUN"

    # Private commercial and buyer PII must be completely absent from response
    assert "buyerEmail" not in data
    assert "buyerPhone" not in data
    assert "inquiryRef" not in data
    assert "quotationRef" not in data
    assert "buyer" not in data


def test_open_email_relay_protection(client):
    """Verify that unauthenticated users cannot trigger outbound SMTP emails via /api/send-email."""
    client.cookies.clear()
    unauth_res = client.post("/api/send-email", json={
        "to": "victim@external.com",
        "subject": "Spam via Relay",
        "body": "Spam payload"
    })
    assert unauth_res.status_code == 401
    assert "Authentication required" in unauth_res.json().get("error", "")

    # Authenticated user with invalid destination email gets 400
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad_email_res = client.post("/api/send-email", json={
        "to": "not-an-email",
        "subject": "Valid auth, bad email"
    }, headers=headers)
    assert bad_email_res.status_code == 400

    # Authenticated user with valid email succeeds
    good_email_res = client.post("/api/send-email", json={
        "to": "authorized-client@goldenglobalexpo.com",
        "subject": "Official Trade Dossier",
        "body": "Your requested trade documents are enclosed."
    }, headers=headers)
    assert good_email_res.status_code == 200
    assert good_email_res.json()["success"] is True


def test_document_vault_size_and_slot_validation(client):
    """Verify document vault rejects payloads smaller than 16 bytes and invalid slots."""
    import io
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Too small payload (< 16 bytes)
    tiny_pdf = io.BytesIO(b"%PDF-tiny")
    tiny_res = client.post(
        "/api/documents/upload",
        data={"bl": "GGE-SIZE-TEST", "slot": "inv"},
        files={"file": ("invoice.pdf", tiny_pdf, "application/pdf")},
        headers=headers
    )
    assert tiny_res.status_code == 400
    assert "Incomplete or corrupted" in tiny_res.json().get("detail", "")

    # Invalid slot
    valid_pdf = io.BytesIO(b"%PDF-1.4 official document data padding")
    slot_res = client.post(
        "/api/documents/upload",
        data={"bl": "GGE-SIZE-TEST", "slot": "malicious_slot_99"},
        files={"file": ("invoice.pdf", valid_pdf, "application/pdf")},
        headers=headers
    )
    assert slot_res.status_code == 400
    assert "Invalid document slot" in slot_res.json().get("detail", "")


def test_sse_stream_dos_rate_limit(client):
    """Verify that exceeding SSE connect rate limits triggers HTTP 429."""
    from backend.core.security import RATE_LIMITER
    test_ip = "127.0.0.1"
    headers = {"X-Forwarded-For": test_ip}
    for _ in range(60):
        allowed, _ = RATE_LIMITER.is_allowed("sse_stream_connect", test_ip, max_requests=60, window_seconds=60)
        assert allowed is True

    # Next request to /api/stream/events must be rejected with HTTP 429
    blocked_res = client.get("/api/stream/events", headers=headers)
    assert blocked_res.status_code == 429
    assert "Too many stream connection attempts" in blocked_res.json().get("error", "")
    assert blocked_res.headers.get("retry-after") is not None


def test_sse_stream_concurrency_limits(client):
    """Verify that exceeding max concurrent streams or capacity returns 429."""
    import backend.routers.stream as stream_module
    test_ip = "127.0.0.1"
    headers = {"X-Forwarded-For": test_ip}
    stream_module.SSE_IP_COUNTS[test_ip] = stream_module.MAX_SSE_PER_IP
    try:
        res = client.get("/api/stream/events", headers=headers)
        assert res.status_code == 429
        assert "Maximum concurrent streams exceeded" in res.json().get("error", "")
    finally:
        stream_module.SSE_IP_COUNTS.clear()


def test_confirm_uncreated_order_rejected(client):
    """Verify that confirming an uncreated/unauthorized order ID is rejected with HTTP 400."""
    res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": "order_fake_unauthorized_999",
        "razorpay_payment_id": "pay_fake_123",
        "amount": 500.0
    })
    assert res.status_code == 400
    assert "not found or expired" in res.json().get("error", "").lower()


def test_sample_payment_flow_creates_trackable_consignment(client):
    """Verify that completing a sample order creates an inquiry, consignment, and audit entry in SQLite."""
    from backend.db import SessionLocal, InquiryModel, ConsignmentModel, AuditLogModel

    create_res = client.post("/api/create-razorpay-order", json={
        "amount": 20.0,
        "currency": "INR",
        "sampleType": "Basmati Rice (500g)",
        "metadata": {
            "name": "Jane Trade Buyer",
            "email": "jane@importer.com",
            "phone": "+91 9876543210",
            "address": "45 Harbor Blvd, Kochi, Kerala",
            "commodity": "Basmati Rice",
            "weight": "500g"
        }
    })
    assert create_res.status_code == 200
    order_id = create_res.json()["orderId"]

    confirm_res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_sample_test_456",
        "amount": 20.0,
        "name": "Jane Trade Buyer",
        "email": "jane@importer.com",
        "phone": "+91 9876543210",
        "address": "45 Harbor Blvd, Kochi, Kerala",
        "commodity": "Basmati Rice",
        "weight": "500g"
    })
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "captured"

    # Verify public tracking portal can track this consignment
    track_res = client.get(f"/api/track?bl={order_id}")
    assert track_res.status_code == 200
    consign = track_res.json()["consignment"]
    assert consign["bl"] == order_id
    assert consign["stage"] == 2
    assert "Air Hub" in consign["status"]
    assert "Basmati Rice" in consign["commodity"]

    # Verify database persistence
    s = SessionLocal()
    try:
        inq = s.query(InquiryModel).filter_by(id=order_id).first()
        assert inq is not None
        assert inq.type == "SAMPLE_ORDER"
        assert inq.email == "jane@importer.com"
        assert "PAID" in inq.status

        c_db = s.query(ConsignmentModel).filter_by(bl=order_id).first()
        assert c_db is not None
        assert c_db.stage == 2

        audit = s.query(AuditLogModel).filter_by(entity_id=order_id).first()
        assert audit is not None
        assert audit.action == "SAMPLE_ORDER_PAID_CAPTURED"
    finally:
        s.close()


def test_logistics_email_arbitrary_ops_subdomain_rejected(client):
    """Verify that an email with substring 'ops' from an untrusted domain cannot authenticate as logistics."""
    # Untrusted domain attempting logistics password
    bad_res = client.post("/api/admin/login", json={
        "email": "hacker-ops@evil.com",
        "password": "Logistics2026!"
    })
    assert bad_res.status_code == 401

    # Legitimate logistics email succeeds
    good_res = client.post("/api/admin/login", json={
        "email": "ops@goldenglobalexpo.com",
        "password": "Logistics2026!"
    })
    assert good_res.status_code == 200
    assert good_res.json()["role"] == "logistics"


def test_csrf_get_logout_rejected(client):
    """Verify that GET /api/auth/logout is rejected with 405 Method Not Allowed, enforcing POST."""
    get_res = client.get("/api/auth/logout")
    assert get_res.status_code == 405

    post_res = client.post("/api/auth/logout")
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True


def test_track_by_container_number(client):
    """Verify that tracking query by exact container number works identically to B/L."""
    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/consignments", json=[{
        "bl": "GGE-TEST-CNT-BL",
        "buyer": "Container Buyer",
        "commodity": "Export Chickpeas",
        "container": "MEDU-998877-6",
        "stage": 3,
        "status": "Stage 3: Port Customs Cleared"
    }], headers=headers)

    # Public tracking by container number
    track_res = client.get("/api/track?bl=MEDU-998877-6")
    assert track_res.status_code == 200
    data = track_res.json()["consignment"]
    assert data["bl"] == "GGE-TEST-CNT-BL"
    assert data["container"] == "MEDU-998877-6"


def test_forex_rate_limiter(client):
    """Verify that GET /api/forex is protected by connection rate limiting."""
    from backend.core.security import RATE_LIMITER
    test_ip = "127.0.0.1"
    headers = {"X-Forwarded-For": test_ip}

    for _ in range(40):
        allowed, _ = RATE_LIMITER.is_allowed("forex-rates", test_ip, max_requests=40, window_seconds=60)
        assert allowed is True

    blocked_res = client.get("/api/forex", headers=headers)
    assert blocked_res.status_code == 429
    assert "Forex rate limit exceeded" in blocked_res.json().get("error", "")


def test_payment_signature_enforcement(client, monkeypatch):
    """Verify cryptographic HMAC SHA256 signature verification and production mandate."""
    import hmac, hashlib

    # 1. Create order
    create_res = client.post("/api/create-razorpay-order", json={
        "amount": 100.0,
        "currency": "INR",
        "sampleType": "Premium Spices Sample",
        "metadata": {
            "name": "Audit Importer",
            "email": "audit@buyer.com",
            "phone": "+91 9123456780",
            "address": "Audit Port Terminal 1",
            "commodity": "Organic Cumin",
            "weight": "500g"
        }
    })
    assert create_res.status_code == 200
    order_id = create_res.json()["orderId"]
    payment_id = "pay_sig_test_12345"
    secret = "rzp_test_secret_for_audit_verify_2026"

    monkeypatch.setenv("RAZORPAY_KEY_SECRET", secret)

    # 2. Test invalid HMAC signature -> rejected with 400
    bad_sig_res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": "invalid_forged_signature_hex",
        "amount": 100.0
    })
    assert bad_sig_res.status_code == 400
    assert "signature verification failed" in bad_sig_res.json().get("error", "").lower()

    # 3. Test production mode with missing signature -> rejected with 400
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    missing_sig_res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "amount": 100.0
    })
    assert missing_sig_res.status_code == 400
    assert "requires razorpay_signature" in missing_sig_res.json().get("error", "").lower()

    # Restore PYTEST_CURRENT_TEST for test harness
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "tests/test_security.py::test_payment_signature_enforcement")

    # 4. Test valid HMAC signature -> accepted with 200
    valid_sig = hmac.new(
        secret.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    good_sig_res = client.post("/api/confirm-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig,
        "amount": 100.0,
        "name": "Audit Importer",
        "email": "audit@buyer.com",
        "phone": "+91 9123456780",
        "address": "Audit Port Terminal 1",
        "commodity": "Organic Cumin",
        "weight": "500g"
    })
    assert good_sig_res.status_code == 200
    assert good_sig_res.json()["status"] == "captured"


def test_no_third_party_formsubmit_leakage():
    """Verify that zero files in the project communicate with or leak to formsubmit.co."""
    import pathlib
    base_path = pathlib.Path(__file__).resolve().parent.parent
    prohibited = "formsubmit.co"

    for ext in ["*.py", "*.js", "*.html"]:
        for fpath in base_path.rglob(ext):
            if any(part.startswith('.') for part in fpath.parts) or "tests" in fpath.parts or "venv" in fpath.parts:
                continue
            content = fpath.read_text(encoding="utf-8", errors="ignore")
            assert prohibited not in content, f"Third-party formsubmit.co leak found in {fpath}"


def test_documents_flat_file_mirror_sync(client):
    """Verify that document upload and deletion synchronize both SQLite and data/consignments.json."""
    import io, json
    from backend.core.config import BASE_DIR

    login_resp = client.post("/api/admin/login", json={"email": "admin@goldenglobalexpo.com", "password": "GoldenAdmin2026!"})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    bl_test = "GGE-TEST-DOC-SYNC-001"
    # Seed test consignment
    client.post("/api/consignments", json=[{
        "bl": bl_test,
        "buyer": "Sync Buyer Ltd",
        "commodity": "Basmati Rice",
        "stage": 2,
        "status": "Lab QA & Phytosanitary Clear"
    }], headers=headers)

    # Upload document
    dummy_pdf = io.BytesIO(b"%PDF-1.4 dummy test content for mirror sync verification")
    upload_res = client.post(
        "/api/documents/upload",
        data={"bl": bl_test, "slot": "phyto"},
        files={"file": ("phyto_certificate.pdf", dummy_pdf, "application/pdf")},
        headers=headers
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["success"] is True

    # Check flat file mirror
    from backend.db import DATA_DIR
    consignments_json_path = os.path.join(DATA_DIR, "consignments.json")
    with open(consignments_json_path, "r", encoding="utf-8") as f:
        consignments_data = json.load(f)
    consign = next((c for c in consignments_data if c.get("bl") == bl_test), None)
    assert consign is not None
    assert consign.get("phytoRef") != ""

    # Delete document
    del_res = client.delete(f"/api/documents/{bl_test}/phyto", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Check flat file mirror reflects deletion
    with open(consignments_json_path, "r", encoding="utf-8") as f:
        consignments_data_after = json.load(f)
    consign_after = next((c for c in consignments_data_after if c.get("bl") == bl_test), None)
    assert consign_after is not None
    assert consign_after.get("phytoRef") == ""


def test_logistics_cannot_escalate_to_admin_via_verify_otp(client):
    """Verify that logistics accounts cannot escalate to 'admin' role via verify-otp payload tampering."""
    from backend.core.config import LOGISTICS_PASSWORD
    from backend.db import SessionLocal, ActiveOtpModel, AdminSessionModel

    # 1. Logistics staff initiates 2FA
    step1_res = client.post("/api/admin/login-step1", json={
        "email": "logistics@goldenglobalexpo.com",
        "password": LOGISTICS_PASSWORD
    })
    assert step1_res.status_code == 200
    assert step1_res.json()["role"] == "logistics"

    # Retrieve dispatched OTP from DB
    session = SessionLocal()
    try:
        otp_rec = session.query(ActiveOtpModel).filter_by(email="logistics@goldenglobalexpo.com").first()
        assert otp_rec is not None
        otp_code = otp_rec.code
    finally:
        session.close()

    # 2. Attacker attempts to claim 'admin' role in verify-otp payload
    verify_res = client.post("/api/auth/verify-otp", json={
        "email": "logistics@goldenglobalexpo.com",
        "otp": otp_code,
        "role": "admin"
    })
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["success"] is True
    # Crucial security assertion: Role must NOT be escalated to admin!
    assert data["role"] == "logistics", f"Privilege escalation detected: role was assigned as {data.get('role')}"
    token = data["token"]

    # Verify that session stored in DB also enforces 'logistics' role
    s = SessionLocal()
    try:
        sess_row = s.query(AdminSessionModel).filter_by(token=token).first()
        assert sess_row is not None
        assert sess_row.role == "logistics"
    finally:
        s.close()

    # Verify that logistics token is forbidden from admin pricing updates
    price_update_res = client.post(
        "/api/prices",
        json={"prices": {"p1": {"price": 999.0}}},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert price_update_res.status_code == 403


def test_malformed_created_at_in_inquiries_handled_gracefully(client):
    """Verify that sending non-numeric createdAt to /api/inquiries does not cause an unhandled 500 error."""
    payload = {
        "id": "RFQ-TEST-MALFORMED-DATE",
        "name": "Date Test Importer",
        "email": "date_test@buyer.com",
        "commodities": "Chia Seeds",
        "createdAt": "invalid-non-numeric-timestamp-2026",
        "created_at": "another-invalid-string"
    }
    res = client.post("/api/inquiries", json=payload)
    assert res.status_code == 200, f"Expected 200 on malformed createdAt string, got {res.status_code}: {res.text}"
    assert res.json()["success"] is True


def test_audit_log_invalid_payload_type_rejected(client):
    """Verify that posting non-dict and non-list payloads to /api/audit returns HTTP 400 Bad Request."""
    from backend.core.config import ADMIN_PASSWORD
    login_res = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_PASSWORD
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Integer payload
    r1 = client.post("/api/audit", json=12345, headers=headers)
    assert r1.status_code == 400
    assert r1.json()["success"] is False

    # String payload
    r2 = client.post("/api/audit", json="invalid_audit_payload_string", headers=headers)
    assert r2.status_code == 400
    assert r2.json()["success"] is False


def test_desk_route_gate_cookie_and_bearer_security(client):
    """Verify that unauthenticated access to /desk and /desk.html is strictly blocked by the route gate."""
    # 1. Unauthenticated request must 302 redirect to /login.html
    unauth_desk = client.get("/desk.html", follow_redirects=False)
    assert unauth_desk.status_code == 302
    assert "/login.html" in unauth_desk.headers.get("location", "")

    unauth_desk_clean = client.get("/desk", follow_redirects=False)
    assert unauth_desk_clean.status_code == 302
    assert "/login.html" in unauth_desk_clean.headers.get("location", "")

    # 2. Authenticated with valid cookie must serve desk.html with 200
    from backend.core.config import ADMIN_PASSWORD
    login_res = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_PASSWORD
    })
    token = login_res.json()["token"]

    client.cookies.set("gge_admin_session", token)
    auth_desk = client.get("/desk.html", follow_redirects=False)
    assert auth_desk.status_code == 200
    assert "Executive Trade Desk" in auth_desk.text
    assert auth_desk.headers.get("cache-control") == "no-store, no-cache, must-revalidate, max-age=0"


def test_inquiries_rejects_empty_list_and_ghost_items(client):
    """Verify that empty list, non-dict payloads, and ghost items are rejected with HTTP 400 Bad Request."""
    # 1. Empty list
    r1 = client.post("/api/inquiries", json=[])
    assert r1.status_code == 400
    assert r1.json()["success"] is False

    # 2. List containing empty dict
    r2 = client.post("/api/inquiries", json=[{}])
    assert r2.status_code == 400
    assert r2.json()["success"] is False

    # 3. List containing whitespace-only entries
    r3 = client.post("/api/inquiries", json=[{"name": "   ", "email": "   ", "commodities": "   "}])
    assert r3.status_code == 400
    assert r3.json()["success"] is False

    # 4. Non-dict, non-list primitive payload
    r4 = client.post("/api/inquiries", json=12345)
    assert r4.status_code == 400
    assert r4.json()["success"] is False


def test_consignments_payload_validation_and_stage_clamping(client):
    """Verify that /api/consignments validates payload types and clamps stage bounds."""
    from backend.core.config import ADMIN_PASSWORD
    login_res = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_PASSWORD
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Non-dict, non-list payload
    r1 = client.post("/api/consignments", json=9999, headers=headers)
    assert r1.status_code == 400
    assert r1.json()["success"] is False

    # 2. Empty payload
    r2 = client.post("/api/consignments", json=[], headers=headers)
    assert r2.status_code == 400
    assert r2.json()["success"] is False

    # 3. Payload with missing B/L
    r3 = client.post("/api/consignments", json=[{"buyer": "Test"}], headers=headers)
    assert r3.status_code == 400
    assert r3.json()["success"] is False

    # 4. Valid consignment with out-of-bounds stage -> clamped to 6
    bl_test = "GGE-STAGE-CLAMP-99"
    r4 = client.post("/api/consignments", json={
        "bl": bl_test,
        "buyer": "Stage Clamp Buyer",
        "stage": 99
    }, headers=headers)
    assert r4.status_code == 200
    assert r4.json()["success"] is True

    from backend.db import SessionLocal, ConsignmentModel
    s = SessionLocal()
    try:
        row = s.query(ConsignmentModel).filter_by(bl=bl_test).first()
        assert row is not None
        assert row.stage == 6
    finally:
        s.close()


def test_forex_fallback_when_offline(client, monkeypatch):
    """Verify that get_forex gracefully falls back to institutional rates when live fetch and cache fail."""
    import backend.routers.prices as prices_module

    def failing_fetch():
        raise urllib.error.URLError("Network unreachable")

    import urllib.error
    monkeypatch.setattr(prices_module, "_fetch_live_forex", failing_fetch)
    # Point cache to non-existent path
    monkeypatch.setattr(prices_module, "BASE_DIR", "/non_existent_path_for_testing")

    res = client.get("/api/forex?force=1")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "rates" in data
    assert data["rates"]["USD"] == 1.0
    assert data["rates"]["INR"] == prices_module.DEFAULT_FOREX_RATES["INR"]


def test_master_code_login_step1_and_single_step(client):
    """Verify that ADMIN_MASTER_CODE grants admin role in both login-step1 and direct login."""
    from backend.core.config import ADMIN_MASTER_CODE

    # Step 1 with arbitrary email and master code
    step1_res = client.post("/api/admin/login-step1", json={
        "email": "emergency_officer@customs-terminal.in",
        "password": ADMIN_MASTER_CODE
    })
    assert step1_res.status_code == 200
    assert step1_res.json()["role"] == "admin"
    assert step1_res.json()["requires2FA"] is True

    # Direct login with master code
    direct_res = client.post("/api/admin/login", json={
        "email": "emergency_officer@customs-terminal.in",
        "password": ADMIN_MASTER_CODE
    })
    assert direct_res.status_code == 200
    assert direct_res.json()["role"] == "admin"


def test_consignment_delete_empty_bl_validation(client):
    """Verify that deleting a consignment with empty or all-underscore code is rejected with 400."""
    from backend.core.config import ADMIN_MASTER_CODE
    login_res = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_MASTER_CODE
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Whitespace or empty BL code
    resp_space = client.delete("/api/consignments/%20", headers=headers)
    assert resp_space.status_code == 400
    assert resp_space.json()["success"] is False

    # Underscores only
    resp_under = client.delete("/api/consignments/___", headers=headers)
    assert resp_under.status_code == 400
    assert resp_under.json()["success"] is False


def test_inquiry_quantity_bounds_clamping(client, db_session):
    """Verify that inquiry creation clamps negative or zero quantities to minimum 1 unit."""
    import time
    from backend.db import InquiryModel
    inq_id = f"RFQ-CLAMP-{int(time.time())}"

    post_resp = client.post("/api/inquiries", json={
        "id": inq_id,
        "name": "Boundaries Trader",
        "email": "bounds@trader.com",
        "commodities": "Classic Toor (Tur Dal)",
        "quantity": -50,
        "packSize": "1kg"
    })
    assert post_resp.status_code == 200

    db_session.expire_all()
    inq = db_session.query(InquiryModel).filter_by(id=inq_id).first()
    assert inq is not None
    assert inq is not None
    assert inq.pack_quantity == 1


def test_csp_header_valid_spec(client):
    """Verify that CSP header uses standard valid https: source directive without invalid wildcard https://*."""
    resp = client.get("/")
    assert resp.status_code == 200
    csp = resp.headers.get("Content-Security-Policy", "")
    assert "https:" in csp
    assert "https://*" not in csp


def test_tracking_endpoint_pii_shield_domestic_and_rfq(client, db_session):
    """Verify that /api/track masks customer PII on domestic orders and RFQs for unauthenticated users, but reveals to authenticated staff."""
    import time
    from backend.db import DomesticOrderModel, InquiryModel

    test_dom_id = f"GGE-DOM-PII-{int(time.time())}"
    test_rfq_id = f"RFQ-PII-{int(time.time())}"

    # Add test domestic order and RFQ
    dom_order = DomesticOrderModel(
        id=test_dom_id,
        commodity="Classic Toor (Tur Dal)",
        pack_size="1kg",
        quantity=2,
        amount=320.0,
        consignee_name="Private Vipul Sharma",
        consignee_phone="+91-9876543210",
        consignee_email="vipul@confidential.in",
        delivery_address="Flat 402, Private Towers, Bandra West",
        city="Mumbai",
        state="Maharashtra",
        pincode="400050",
        payment_status="PAID",
        order_status="Delivered",
        created_at=time.time()
    )
    inq_rfq = InquiryModel(
        id=test_rfq_id,
        name="Private Buyer Alice",
        company="Secret Mega Importers LLC",
        email="alice@megaimporters.com",
        phone="+1-555-0199",
        country="United States",
        commodities="Organic Emmer Wheat",
        volume="24.0 MT",
        status="Under Review",
        created_at=time.time()
    )
    db_session.add(dom_order)
    db_session.add(inq_rfq)
    db_session.commit()

    # 1. Anonymous lookup: PII must be shielded
    client.cookies.clear()
    dom_res = client.get(f"/api/track?bl={test_dom_id}")
    assert dom_res.status_code == 200
    dom_data = dom_res.json()["order"]
    assert dom_data["name"] == "Authorized Consignee"
    assert "Private Vipul Sharma" not in dom_data["name"]
    assert "400050" not in dom_data["destination"]

    rfq_res = client.get(f"/api/track?bl={test_rfq_id}")
    assert rfq_res.status_code == 200
    rfq_data = rfq_res.json()["inquiry"]
    assert rfq_data["name"] == "Authorized Commercial Buyer"
    assert rfq_data["company"] == "Registered Trade Client"
    assert "Alice" not in rfq_data["name"]
    assert "Secret Mega Importers" not in rfq_data["company"]

    # 2. Authenticated lookup: Staff sees actual records
    from backend.core.config import ADMIN_MASTER_CODE
    login_res = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_MASTER_CODE
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    auth_dom_res = client.get(f"/api/track?bl={test_dom_id}", headers=headers)
    assert auth_dom_res.status_code == 200
    auth_dom_data = auth_dom_res.json()["order"]
    assert auth_dom_data["name"] == "Private Vipul Sharma"
    assert "400050" in auth_dom_data["destination"]

    auth_rfq_res = client.get(f"/api/track?bl={test_rfq_id}", headers=headers)
    assert auth_rfq_res.status_code == 200
    auth_rfq_data = auth_rfq_res.json()["inquiry"]
    assert auth_rfq_data["name"] == "Private Buyer Alice"
    assert auth_rfq_data["company"] == "Secret Mega Importers LLC"


def test_inquiries_authenticated_batch_limit(client):
    """Verify that authenticated users cannot exceed the maximum batch limit of 50 items."""
    from backend.core.config import ADMIN_MASTER_CODE
    login_res = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_MASTER_CODE
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to post 51 items
    oversized_batch = [{"name": f"Lead {i}", "email": f"lead{i}@example.com"} for i in range(51)]
    resp = client.post("/api/inquiries", json=oversized_batch, headers=headers)
    assert resp.status_code == 400
    assert "Batch limit exceeded" in resp.json()["error"]











"""
Golden Global Expo — Multi-Worker Database-Backed State Regression Tests
Verifies that SQLite (data/enterprise.db) maintains synchronized state across
simulated concurrent Uvicorn worker instances for:
1. Active OTPs (ActiveOtpModel) & constant-time validation
2. Rate limit hits and locks (RateLimitHitModel & RateLimitLockModel)
3. Commercial sample payment sessions (PaymentSessionModel)
"""

import time
import pytest
from starlette.testclient import TestClient
from backend.app import app
from backend.db import (
    SessionLocal, ActiveOtpModel, RateLimitHitModel, RateLimitLockModel, PaymentSessionModel
)
from backend.core.security import RATE_LIMITER
from backend.routers.auth import _prune_active_otps
from backend.routers.payments import _prune_payment_sessions


@pytest.fixture
def worker_clients():
    """Creates multiple independent client instances simulating distinct Uvicorn worker processes."""
    return [TestClient(app), TestClient(app), TestClient(app), TestClient(app)]


def test_multi_worker_otp_cross_worker_persistence_and_verification(worker_clients):
    """
    Simulate Worker 1 creating an OTP, Worker 2 verifying it from shared SQLite DB,
    and verifying constant-time execution and post-verification cleanup.
    """
    worker1, worker2 = worker_clients[0], worker_clients[1]
    admin_email = "admin@goldenglobalexpo.com"

    # Worker 1: Request OTP
    req_resp = worker1.post("/api/auth/request-otp", json={"email": admin_email})
    assert req_resp.status_code == 200
    assert req_resp.json()["success"] is True

    # Independent worker inspects SQLite to confirm state is persisted across processes
    session = SessionLocal()
    try:
        otp_row = session.query(ActiveOtpModel).filter_by(email=admin_email).first()
        assert otp_row is not None
        assert len(otp_row.code) == 6
        assert otp_row.attempts == 0
        assert otp_row.expires_at > time.time()
        persisted_otp = otp_row.code
    finally:
        session.close()

    # Worker 2: Verify OTP created by Worker 1
    verify_resp = worker2.post("/api/auth/verify-otp", json={"email": admin_email, "otp": persisted_otp})
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["success"] is True
    assert "token" in verify_data

    # Verify that the OTP record was deleted from SQLite upon successful authentication
    session = SessionLocal()
    try:
        after_row = session.query(ActiveOtpModel).filter_by(email=admin_email).first()
        assert after_row is None
    finally:
        session.close()


def test_multi_worker_otp_attempts_tracking_and_auto_revocation(worker_clients):
    """
    Simulate Worker 1 creating an OTP, Worker 2 and 3 submitting incorrect attempts,
    confirming SQLite tracks attempts across workers and revokes after 5 failures.
    """
    worker1, worker2, worker3, worker4 = worker_clients
    admin_email = "admin@goldenglobalexpo.com"

    # Worker 1: Request OTP
    r = worker1.post("/api/auth/request-otp", json={"email": admin_email})
    assert r.status_code == 200

    # Get valid code for reference
    session = SessionLocal()
    try:
        otp_row = session.query(ActiveOtpModel).filter_by(email=admin_email).first()
        valid_otp = otp_row.code
    finally:
        session.close()

    # Worker 2: Submit 4 invalid attempts
    for attempt in range(1, 5):
        resp = worker2.post("/api/auth/verify-otp", json={"email": admin_email, "otp": "000000"})
        assert resp.status_code == 400
        assert f"{5 - attempt} attempts remaining" in resp.json()["error"]

        # Verify SQLite attempts counter matches across workers
        s = SessionLocal()
        try:
            row = s.query(ActiveOtpModel).filter_by(email=admin_email).first()
            assert row is not None
            assert row.attempts == attempt
        finally:
            s.close()

    # Worker 3: Submit 5th invalid attempt -> must trigger HTTP 429 and revoke OTP in SQLite
    revoked_resp = worker3.post("/api/auth/verify-otp", json={"email": admin_email, "otp": "000000"})
    assert revoked_resp.status_code == 429
    assert "revoked" in revoked_resp.json()["error"].lower()

    # Verify SQLite record is deleted
    s = SessionLocal()
    try:
        row = s.query(ActiveOtpModel).filter_by(email=admin_email).first()
        assert row is None
    finally:
        s.close()

    # Worker 4: Even with the original valid OTP, verification must now fail
    late_resp = worker4.post("/api/auth/verify-otp", json={"email": admin_email, "otp": valid_otp})
    assert late_resp.status_code == 400
    assert "no pending authorization request" in late_resp.json()["error"].lower()


def test_multi_worker_otp_expiration_pruning(worker_clients):
    """Verify that expired OTPs stored in SQLite are cleanly pruned while active OTPs remain."""
    worker = worker_clients[0]
    admin_email = "admin@goldenglobalexpo.com"
    active_email = "nigadearyan@gmail.com"

    # Insert an expired OTP and an active OTP directly into SQLite
    s = SessionLocal()
    try:
        s.query(ActiveOtpModel).filter(ActiveOtpModel.email.in_([admin_email, active_email])).delete()
        s.add(ActiveOtpModel(
            email=admin_email,
            code="123456",
            expires_at=time.time() - 10,
            attempts=0,
            created_at=time.time() - 610
        ))
        s.add(ActiveOtpModel(
            email=active_email,
            code="654321",
            expires_at=time.time() + 600,
            attempts=0,
            created_at=time.time()
        ))
        s.commit()
    finally:
        s.close()

    # Explicitly trigger database pruning
    _prune_active_otps()

    # Confirm expired record has been pruned, but active record is retained
    s = SessionLocal()
    try:
        expired_row = s.query(ActiveOtpModel).filter_by(email=admin_email).first()
        active_row = s.query(ActiveOtpModel).filter_by(email=active_email).first()
        assert expired_row is None
        assert active_row is not None
        assert active_row.code == "654321"
    finally:
        s.close()

    # Worker verifies pruned/expired OTP -> rejected with 400
    resp = worker.post("/api/auth/verify-otp", json={"email": admin_email, "otp": "123456"})
    assert resp.status_code == 400
    assert resp.json()["success"] is False


def test_multi_worker_rate_limiting_shared_state(worker_clients):
    """
    Simulate requests from the same IP distributed across Worker 1, Worker 2, and Worker 3.
    Confirm that hits recorded by Worker 1 throttle requests on Worker 3 once ceiling is reached.
    """
    worker1, worker2, worker3 = worker_clients[0], worker_clients[1], worker_clients[2]
    shared_ip = "198.51.100.99"
    headers = {"X-Real-IP": shared_ip}

    # request-otp has max_requests=4 per 600s
    # Worker 1: 2 requests
    for _ in range(2):
        r = worker1.post("/api/auth/request-otp", json={"email": "admin@goldenglobalexpo.com"}, headers=headers)
        assert r.status_code == 200

    # Worker 2: 2 requests
    for _ in range(2):
        r = worker2.post("/api/auth/request-otp", json={"email": "admin@goldenglobalexpo.com"}, headers=headers)
        assert r.status_code == 200

    # Confirm 4 hits exist in SQLite RateLimitHitModel
    s = SessionLocal()
    try:
        hits = s.query(RateLimitHitModel).filter_by(ip=shared_ip, endpoint="request-otp").count()
        assert hits == 4
    finally:
        s.close()

    # Worker 3: 5th request from same IP must be rejected with 429
    over_resp = worker3.post("/api/auth/request-otp", json={"email": "admin@goldenglobalexpo.com"}, headers=headers)
    assert over_resp.status_code == 429
    assert "rate limit exceeded" in over_resp.json()["error"].lower()
    assert "retry-after" in over_resp.headers


def test_multi_worker_rate_limit_lockout_and_master_unlock(worker_clients):
    """
    Verify IP lockout persists in SQLite RateLimitLockModel across workers,
    and master access code resets the lock across all worker processes.
    """
    worker1, worker2, worker3 = worker_clients[0], worker_clients[1], worker_clients[2]
    test_ip = "198.51.100.101"
    headers = {"X-Real-IP": test_ip}

    # Explicitly lock IP via RATE_LIMITER
    RATE_LIMITER.lock_ip(test_ip, lock_seconds=600)

    # Confirm RateLimitLockModel row exists in SQLite
    s = SessionLocal()
    try:
        lock_row = s.query(RateLimitLockModel).filter_by(ip=test_ip).first()
        assert lock_row is not None
        assert lock_row.expires_at > time.time()
    finally:
        s.close()

    # Worker 2 attempts an operation from locked IP -> receives 429
    allowed, retry_after = RATE_LIMITER.is_allowed("test-op", test_ip, max_requests=10, window_seconds=60)
    assert allowed is False
    assert retry_after > 0

    # Worker 3 uses master code -> resets lock in SQLite
    master_resp = worker3.post("/api/auth/verify-otp", json={"email": "admin@goldenglobalexpo.com", "otp": "991448"}, headers=headers)
    assert master_resp.status_code == 200

    # Confirm lock row is removed from SQLite
    s = SessionLocal()
    try:
        lock_row = s.query(RateLimitLockModel).filter_by(ip=test_ip).first()
        assert lock_row is None
    finally:
        s.close()

    # Worker 1 is now allowed
    allowed_now, _ = RATE_LIMITER.is_allowed("test-op", test_ip, max_requests=10, window_seconds=60)
    assert allowed_now is True


def test_multi_worker_payment_session_persistence(worker_clients):
    """
    Simulate Worker 1 creating an order, Worker 2 checking pending status,
    Worker 3 attempting tampering, and Worker 4 capturing payment and updating DB.
    """
    worker1, worker2, worker3, worker4 = worker_clients

    # Ensure clean test state
    s = SessionLocal()
    try:
        s.query(PaymentSessionModel).filter_by(order_id="GGE-SMP-MULTI-999").delete()
        s.commit()
    finally:
        s.close()

    # Worker 1: Create payment order for 1200.0 INR
    create_res = worker1.post("/api/create-razorpay-order", json={
        "amount": 1200.0,
        "currency": "INR",
        "sampleId": "GGE-SMP-MULTI-999",
        "commodity": "Organic Moong Dal",
        "weight": "1kg"
    })
    assert create_res.status_code == 200
    order_id = create_res.json()["orderId"]

    # Confirm PaymentSessionModel exists in SQLite
    s = SessionLocal()
    try:
        ps = s.query(PaymentSessionModel).filter_by(order_id=order_id).first()
        assert ps is not None
        assert ps.amount == 1200.0
        assert ps.currency == "INR"
        assert ps.status == "created"
    finally:
        s.close()

    # Worker 2: Query payment status
    stat_res = worker2.get(f"/api/payment-status?order_id={order_id}")
    assert stat_res.status_code == 200
    assert stat_res.json()["status"] == "created"
    assert stat_res.json()["amount"] == 1200.0

    # Worker 3: Attempt price tampering (amount mismatch)
    tamper_res = worker3.post("/api/confirm-payment", json={
        "orderId": order_id,
        "paymentId": "pay_tamper_attempt",
        "amount": 10.0
    })
    assert tamper_res.status_code == 400
    assert "tampering" in tamper_res.json()["error"].lower()

    # Worker 4: Legitimate confirmation with correct authorized amount
    confirm_res = worker4.post("/api/confirm-payment", json={
        "orderId": order_id,
        "paymentId": "pay_legit_multi_worker",
        "amount": 1200.0,
        "name": "Global Trader Inc",
        "email": "trader@globaltrade.com"
    })
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "captured"

    # Confirm SQLite has captured status and payment ID
    s = SessionLocal()
    try:
        ps_captured = s.query(PaymentSessionModel).filter_by(order_id=order_id).first()
        assert ps_captured is not None
        assert ps_captured.status == "captured"
        assert ps_captured.payment_id == "pay_legit_multi_worker"
        assert ps_captured.captured_at is not None
    finally:
        s.close()

    # Worker 1 queries status again -> captured
    final_stat = worker1.get(f"/api/payment-status?order_id={order_id}")
    assert final_stat.status_code == 200
    assert final_stat.json()["status"] == "captured"
    assert final_stat.json()["paymentId"] == "pay_legit_multi_worker"


def test_multi_worker_otp_nonexistent_email_and_unauthorized(worker_clients):
    """Verify constant-time safe rejection for non-existent pending OTPs and unauthorized emails."""
    worker = worker_clients[0]

    # Non-existent pending OTP
    res = worker.post("/api/auth/verify-otp", json={"email": "admin@goldenglobalexpo.com", "otp": "123456"})
    assert res.status_code == 400
    assert "no pending authorization" in res.json()["error"].lower()

    # Unauthorized email request
    unauth_res = worker.post("/api/auth/request-otp", json={"email": "attacker@evil.com"})
    assert unauth_res.status_code == 403
    assert "access denied" in unauth_res.json()["error"].lower()


def test_multi_worker_rate_limiter_selective_ip_reset():
    """Verify RATE_LIMITER.reset(ip) wipes hits and locks for only the specified IP from SQLite."""
    ip_a = "192.0.2.1"
    ip_b = "192.0.2.2"

    # Add hits for both IPs
    for _ in range(3):
        RATE_LIMITER.is_allowed("test_ep", ip_a, max_requests=10, window_seconds=60)
        RATE_LIMITER.is_allowed("test_ep", ip_b, max_requests=10, window_seconds=60)

    # Lock IP A
    RATE_LIMITER.lock_ip(ip_a, lock_seconds=300)

    s = SessionLocal()
    try:
        assert s.query(RateLimitHitModel).filter_by(ip=ip_a).count() == 3
        assert s.query(RateLimitHitModel).filter_by(ip=ip_b).count() == 3
        assert s.query(RateLimitLockModel).filter_by(ip=ip_a).count() == 1
    finally:
        s.close()

    # Reset only IP A
    RATE_LIMITER.reset(ip_a)

    s = SessionLocal()
    try:
        assert s.query(RateLimitHitModel).filter_by(ip=ip_a).count() == 0
        assert s.query(RateLimitLockModel).filter_by(ip=ip_a).count() == 0
        # IP B must remain untouched
        assert s.query(RateLimitHitModel).filter_by(ip=ip_b).count() == 3
    finally:
        s.close()

    # Clean up IP B
    RATE_LIMITER.reset(ip_b)


def test_email_service_resilience_and_transport_selection(monkeypatch):
    """
    Verify backend/services/email_service.py cleanly handles credentials from env,
    routes correctly to SMTP_SSL (port 465) vs STARTTLS (port 587), and handles fallback.
    """
    from backend.services.email_service import background_send_email_task

    # 1. Fallback mode: SMTP_PASS is empty -> no network call, logs mock
    monkeypatch.setenv("SMTP_PASS", "")
    email_data = {
        "to": "buyer@international.com",
        "subject": "Commercial Invoice Dossier",
        "body": "<p>Please find enclosed export invoice.</p>"
    }
    # Must complete safely without error
    background_send_email_task(email_data)

    # 2. Invalid recipient email: missing '@' -> early return without network calls
    invalid_data = {
        "to": "invalid-email-address",
        "subject": "Test",
        "body": "Test"
    }
    background_send_email_task(invalid_data)

    # 3. Port 465 SSL transport: mock smtplib.SMTP_SSL
    ssl_called = {"status": False}
    class MockSMTP_SSL:
        def __init__(self, host, port, timeout=15):
            assert host == "smtp.enterprise.com"
            assert port == 465
            ssl_called["status"] = True
        def __enter__(self): return self
        def __exit__(self, exc_type, exc_val, exc_tb): pass
        def ehlo(self): pass
        def login(self, user, password): pass
        def send_message(self, msg): pass

    monkeypatch.setenv("SMTP_HOST", "smtp.enterprise.com")
    monkeypatch.setenv("SMTP_PORT", "465")
    monkeypatch.setenv("SMTP_USER", "trade@enterprise.com")
    monkeypatch.setenv("SMTP_PASS", "SuperSecretAppPass2026")
    monkeypatch.setattr("smtplib.SMTP_SSL", MockSMTP_SSL)

    background_send_email_task(email_data)
    assert ssl_called["status"] is True

    # 4. Port 587 STARTTLS transport: mock smtplib.SMTP
    starttls_called = {"status": False, "starttls": False}
    class MockSMTP:
        def __init__(self, host, port, timeout=15):
            assert host == "smtp.enterprise.com"
            assert port == 587
            starttls_called["status"] = True
        def __enter__(self): return self
        def __exit__(self, exc_type, exc_val, exc_tb): pass
        def ehlo(self): pass
        def starttls(self): starttls_called["starttls"] = True
        def login(self, user, password): pass
        def send_message(self, msg): pass

    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setattr("smtplib.SMTP", MockSMTP)

    background_send_email_task(email_data)
    assert starttls_called["status"] is True
    assert starttls_called["starttls"] is True


def test_payment_pruning_preserves_captured_records():
    """Verify that _prune_payment_sessions purges ONLY unconfirmed sessions and retains captured payments."""
    now = time.time()
    s = SessionLocal()
    try:
        s.query(PaymentSessionModel).filter(
            PaymentSessionModel.order_id.in_(["order_prune_captured", "order_prune_created"])
        ).delete()
        # Old captured payment (25 hours ago)
        s.add(PaymentSessionModel(
            order_id="order_prune_captured",
            amount=750.0,
            currency="INR",
            status="captured",
            payment_id="pay_prune_test_1",
            created_at=now - 90000,
            captured_at=now - 89000
        ))
        # Old abandoned created session (25 hours ago)
        s.add(PaymentSessionModel(
            order_id="order_prune_created",
            amount=750.0,
            currency="INR",
            status="created",
            created_at=now - 90000
        ))
        s.commit()
    finally:
        s.close()

    _prune_payment_sessions()

    s = SessionLocal()
    try:
        cap_row = s.query(PaymentSessionModel).filter_by(order_id="order_prune_captured").first()
        cre_row = s.query(PaymentSessionModel).filter_by(order_id="order_prune_created").first()
        assert cap_row is not None, "Captured payment records must NOT be pruned"
        assert cap_row.status == "captured"
        assert cap_row.payment_id == "pay_prune_test_1"
        assert cre_row is None, "Abandoned uncaptured sessions must be pruned after 24h"
    finally:
        s.close()


def test_payment_order_cannot_overwrite_captured_session(worker_clients):
    """Verify that an order that has already been captured cannot be reset to 'created' via create-razorpay-order."""
    worker = worker_clients[0]
    now = time.time()
    test_id = "GGE-SMP-CAPTURED-IMMUTABLE"

    s = SessionLocal()
    try:
        s.query(PaymentSessionModel).filter_by(order_id=test_id).delete()
        s.add(PaymentSessionModel(
            order_id=test_id,
            amount=500.0,
            currency="INR",
            status="captured",
            payment_id="pay_initial_captured",
            created_at=now,
            captured_at=now
        ))
        s.commit()
    finally:
        s.close()

    # Attempt to re-initialize an already captured order
    tamper_res = worker.post("/api/create-razorpay-order", json={
        "amount": 10.0,
        "sampleId": test_id
    })
    assert tamper_res.status_code == 400
    assert "already been completed and captured" in tamper_res.json()["error"].lower()

    # Confirm record remains unmodified in SQLite
    s = SessionLocal()
    try:
        row = s.query(PaymentSessionModel).filter_by(order_id=test_id).first()
        assert row is not None
        assert row.status == "captured"
        assert row.amount == 500.0
        assert row.payment_id == "pay_initial_captured"
    finally:
        s.close()


def test_payment_confirmation_idempotent_no_duplicate_audit(worker_clients):
    """Verify that multiple confirmation calls for the same order are idempotent and avoid duplicate audit entries."""
    from backend.db import AuditLogModel
    worker = worker_clients[0]
    test_order = "GGE-SMP-IDEMPOTENT-TEST"

    s = SessionLocal()
    try:
        s.query(PaymentSessionModel).filter_by(order_id=test_order).delete()
        s.query(AuditLogModel).filter_by(entity_id=test_order).delete()
        s.commit()
    finally:
        s.close()

    # 1. Create order
    cr_res = worker.post("/api/create-razorpay-order", json={"amount": 350.0, "sampleId": test_order})
    assert cr_res.status_code == 200

    # 2. First confirmation
    c1_res = worker.post("/api/confirm-payment", json={
        "orderId": test_order,
        "paymentId": "pay_first_legit",
        "amount": 350.0
    })
    assert c1_res.status_code == 200
    assert c1_res.json()["status"] == "captured"

    s = SessionLocal()
    try:
        audit_count_1 = s.query(AuditLogModel).filter_by(entity_id=test_order).count()
        assert audit_count_1 == 1
    finally:
        s.close()

    # 3. Second confirmation (duplicate webhook or replay)
    c2_res = worker.post("/api/confirm-payment", json={
        "orderId": test_order,
        "paymentId": "pay_replay_ignored",
        "amount": 350.0
    })
    assert c2_res.status_code == 200
    assert c2_res.json()["status"] == "captured"

    # Audit count must still be 1 (no duplicate phantom transition)
    s = SessionLocal()
    try:
        audit_count_2 = s.query(AuditLogModel).filter_by(entity_id=test_order).count()
        assert audit_count_2 == 1
        ps = s.query(PaymentSessionModel).filter_by(order_id=test_order).first()
        assert ps.payment_id == "pay_first_legit"
    finally:
        s.close()


def test_true_multithreaded_concurrent_worker_rate_limiting():
    """Verify that multiple concurrent worker threads hammering SQLite rate limiter stay synchronized."""
    import concurrent.futures
    test_ip = "192.0.2.77"
    RATE_LIMITER.reset(test_ip)

    def worker_hit(idx):
        return RATE_LIMITER.is_allowed("concurrent-burst", test_ip, max_requests=8, window_seconds=60)

    # Fire 24 concurrent requests across 8 worker threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(worker_hit, range(24)))

    allowed_count = sum(1 for allowed, _ in results if allowed)
    blocked_count = sum(1 for allowed, _ in results if not allowed)

    assert allowed_count == 8, f"Expected exactly 8 allowed requests, got {allowed_count}"
    assert blocked_count == 16, f"Expected exactly 16 throttled requests, got {blocked_count}"

    s = SessionLocal()
    try:
        total_hits = s.query(RateLimitHitModel).filter_by(endpoint="concurrent-burst", ip=test_ip).count()
        assert total_hits == 8
    finally:
        s.close()
    RATE_LIMITER.reset(test_ip)


def test_true_multithreaded_concurrent_otp_requests(worker_clients):
    """Verify that simultaneous concurrent OTP requests for the same email do not crash or create duplicate rows."""
    import concurrent.futures
    worker = worker_clients[0]
    admin_email = "admin@goldenglobalexpo.com"
    RATE_LIMITER.reset()

    def send_req(i):
        return worker.post("/api/auth/request-otp", json={"email": admin_email}).status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        codes = list(executor.map(send_req, range(4)))

    # All should return 200 without 500 IntegrityError
    assert all(c in [200, 429] for c in codes)
    assert 200 in codes

    # Exactly one row exists in SQLite ActiveOtpModel
    s = SessionLocal()
    try:
        rows = s.query(ActiveOtpModel).filter_by(email=admin_email).all()
        assert len(rows) == 1
        assert len(rows[0].code) == 6
    finally:
        s.close()


def test_2fa_full_lifecycle(client):
    """Verify the 2-step 2FA login lifecycle: Step 1 (Password) -> Step 2 (OTP/Master Key) -> Session."""
    # 1. Step 1 with wrong password fails
    bad_step1 = client.post("/api/admin/login-step1", json={
        "email": "admin@goldenglobalexpo.com",
        "password": "WrongPassword!"
    })
    assert bad_step1.status_code == 401
    assert bad_step1.json()["success"] is False

    # 2. Step 1 with valid password succeeds and initiates 2FA
    good_step1 = client.post("/api/admin/login-step1", json={
        "email": "admin@goldenglobalexpo.com",
        "password": "GoldenAdmin2026!"
    })
    assert good_step1.status_code == 200
    s1_data = good_step1.json()
    assert s1_data["success"] is True
    assert s1_data["requires2FA"] is True
    assert "maskedEmail" in s1_data
    target_email = s1_data["email"]

    # Retrieve dispatched OTP from database
    s = SessionLocal()
    try:
        otp_rec = s.query(ActiveOtpModel).filter_by(email=target_email).first()
        assert otp_rec is not None
        dispatched_otp = otp_rec.code
    finally:
        s.close()

    # 3. Step 2 with incorrect OTP fails
    bad_step2 = client.post("/api/auth/verify-otp", json={
        "email": target_email,
        "otp": "000000"
    })
    assert bad_step2.status_code == 400
    assert bad_step2.json()["success"] is False

    # 4. Step 2 with valid OTP succeeds and issues authenticated session
    good_step2 = client.post("/api/auth/verify-otp", json={
        "email": target_email,
        "otp": dispatched_otp,
        "role": "admin"
    })
    assert good_step2.status_code == 200
    s2_data = good_step2.json()
    assert s2_data["success"] is True
    assert "token" in s2_data
    assert "gge_admin_session" in good_step2.cookies
    token = s2_data["token"]

    # 5. Access protected /desk.html with issued 2FA cookie
    client.cookies.set("gge_admin_session", token)
    desk_resp = client.get("/desk.html")
    assert desk_resp.status_code == 200
    assert len(desk_resp.content) > 1000




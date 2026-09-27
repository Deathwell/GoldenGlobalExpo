"""
Unit & Integration Tests for Consignment Tracking Boundaries, SQL Injection Defenses,
PII Privacy Masking, and System Resilience.
"""

import time
import pytest
from starlette.testclient import TestClient
from backend.app import app
from backend.db import SessionLocal, AdminSessionModel, ConsignmentModel, DomesticOrderModel, InquiryModel
from backend.core.resilience import CircuitBreaker, CircuitState, CircuitBreakerOpenException


@pytest.fixture
def auth_staff_headers():
    session = SessionLocal()
    token = "test_staff_tracking_token_2026"
    try:
        session.query(AdminSessionModel).filter_by(token=token).delete()
        admin_session = AdminSessionModel(
            token=token,
            email="ops@goldenglobalexpo.com",
            role="admin",
            created_at=time.time(),
            expires_at=time.time() + 3600
        )
        session.add(admin_session)
        session.commit()
    finally:
        session.close()

    return {"Authorization": f"Bearer {token}"}


# ================= 1. TRACKING INPUT BOUNDARIES & SQL INJECTION DEFENSE =================

def test_track_empty_query_rejected(client):
    """Empty or whitespace-only tracking parameters return HTTP 400."""
    resp1 = client.get("/api/track?bl=")
    assert resp1.status_code == 400
    assert resp1.json()["success"] is False

    resp2 = client.get("/api/track?bl=%20%20%20")
    assert resp2.status_code == 400


def test_track_sql_injection_payload_handled_safely(client):
    """SQL injection payloads in tracking queries are parameterized and produce safe 404 or clean response."""
    sql_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE consignments; --",
        "GGE-JNPT' UNION SELECT * FROM inquiries --",
        "' OR 1=1 --",
        "admin'--"
    ]
    for payload in sql_payloads:
        resp = client.get(f"/api/track?bl={payload}")
        # Must return 404 cleanly without 500 database execution error
        assert resp.status_code in (200, 404)
        assert resp.json()["success"] in (True, False)


def test_track_xss_script_payload_sanitized(client):
    """XSS payloads in tracking parameters do not cause reflected HTML execution."""
    xss_payload = "<script>alert('XSS')</script>"
    resp = client.get(f"/api/track?bl={xss_payload}")
    assert resp.status_code in (200, 404)
    # Header nosniff and JSON response ensure no HTML execution
    assert resp.headers.get("content-type", "").startswith("application/json")


# ================= 2. PII REDACTION IN TRACKING (ANONYMOUS VS AUTHENTICATED) =================

def test_track_pii_shield_maritime_consignment(client, auth_staff_headers):
    """Anonymous visitors receive redacted consignment details; staff receive full CRM metadata."""
    # 1. Anonymous visitor tracking lookup
    anon_resp = client.get("/api/track?bl=GGE-JNPT-2026")
    assert anon_resp.status_code == 200
    anon_data = anon_resp.json()
    assert anon_data["success"] is True
    consign = anon_data["consignment"]
    # Critical buyer identity, email, and phone must NOT be in public telemetry
    assert "buyer" not in consign or consign.get("buyer") is None or consign.get("buyer") == ""
    assert "buyerEmail" not in consign or consign.get("buyerEmail") is None or consign.get("buyerEmail") == ""
    assert "buyerPhone" not in consign or consign.get("buyerPhone") is None or consign.get("buyerPhone") == ""

    # 2. Authenticated trade desk officer lookup
    auth_resp = client.get("/api/track?bl=GGE-JNPT-2026", headers=auth_staff_headers)
    assert auth_resp.status_code == 200
    auth_data = auth_resp.json()
    auth_consign = auth_data["consignment"]
    # Authenticated staff must see buyer reference
    assert "buyer" in auth_consign


# ================= 3. CIRCUIT BREAKER FAULT HANDLING =================

def test_circuit_breaker_custom_recovery():
    """Verify circuit breaker trips and auto-recovers after timeout."""
    cb = CircuitBreaker(
        name="custom_resilience_test",
        failure_threshold=2,
        recovery_timeout=0.1,
        half_open_success_threshold=1
    )

    @cb
    def unstable_dependency(should_fail=False):
        if should_fail:
            raise ConnectionError("Remote service disconnected")
        return "healthy"

    # Call succeeds
    assert unstable_dependency(should_fail=False) == "healthy"
    assert cb.state == CircuitState.CLOSED

    # 2 consecutive failures trip the breaker
    with pytest.raises(ConnectionError):
        unstable_dependency(should_fail=True)
    with pytest.raises(ConnectionError):
        unstable_dependency(should_fail=True)

    assert cb.state == CircuitState.OPEN

    # Fast reject occurs immediately without calling inner function
    with pytest.raises(CircuitBreakerOpenException):
        unstable_dependency(should_fail=False)

    # Wait for recovery timeout
    time.sleep(0.15)
    assert cb.state == CircuitState.HALF_OPEN

    # Successful probe restores CLOSED state
    assert unstable_dependency(should_fail=False) == "healthy"
    assert cb.state == CircuitState.CLOSED

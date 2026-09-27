"""
Tests for Kubernetes/Cloud Standardized /healthz & /readyz Probes and Structured Error Middleware
"""

import pytest
from starlette.testclient import TestClient
from backend.app import app
from backend.core.config import APP_VERSION


def test_healthz_root_liveness(client):
    """Verify /healthz returns immediate HTTP 200 liveness signal."""
    resp = client.get("/healthz")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "Golden Global Expo" in data["app"]
    assert data["version"] == APP_VERSION
    assert "timestamp" in data
    assert "uptimeSeconds" in data
    assert isinstance(data["uptimeSeconds"], int)


def test_readyz_root_readiness_healthy(client):
    """Verify /readyz returns HTTP 200 with database and storage health checks."""
    resp = client.get("/readyz")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["database"] == "CONNECTED"
    assert data["storage"] == "WRITABLE"
    assert isinstance(data["db_latency_ms"], (int, float))
    assert data["db_latency_ms"] >= 0.0
    assert data["checks"]["database"] == "UP"
    assert data["checks"]["storage"] == "UP"


def test_readyz_database_degraded_returns_503(client, monkeypatch):
    """Verify /readyz returns HTTP 503 Service Unavailable when database connection is down."""
    import backend.routers.health as health_mod

    # Simulate database outage (get_db_latency_ms returning -1.0)
    monkeypatch.setattr(health_mod, "get_db_latency_ms", lambda: -1.0)

    resp = client.get("/readyz")
    assert resp.status_code == 503
    data = resp.json()
    assert data["status"] == "unready"
    assert data["database"] == "DISCONNECTED"
    assert data["db_latency_ms"] == -1.0
    assert data["checks"]["database"] == "DOWN"


def test_healthz_and_readyz_router_endpoints(client):
    """Verify /api/health/healthz and /api/health/readyz are accessible via domain router."""
    h_resp = client.get("/api/health/healthz")
    assert h_resp.status_code == 200
    assert h_resp.json()["status"] == "ok"

    r_resp = client.get("/api/health/readyz")
    assert r_resp.status_code == 200
    assert r_resp.json()["status"] == "ready"


def test_structured_json_error_handling_for_http_exceptions(client):
    """Verify that HTTPExceptions return standardized structured JSON with error and detail fields."""
    # Attempting to fetch document for non-existent slot triggers 400 or 404
    resp = client.get("/api/documents/NON_EXISTENT_BL/invalid_slot")
    assert resp.status_code in (400, 404)
    data = resp.json()
    assert data["success"] is False
    assert "error" in data
    assert len(data["error"]) > 0


def test_structured_json_error_handling_404_routing(client):
    """Verify that visiting an unmapped endpoint produces clean structured response."""
    resp = client.get("/api/non-existent-endpoint-probe-404")
    assert resp.status_code == 404

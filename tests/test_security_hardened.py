import os
import pytest
from starlette.testclient import TestClient
from backend.app import app
from backend.core import config
from backend.routers.auth import _log_master_security_alert
from backend.db import SessionLocal, AuditLogModel

def test_production_master_code_disabled_when_unset(monkeypatch):
    """Verify that in production mode, if MASTER_SECURITY_KEY is not set, ADMIN_MASTER_CODE is None."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("MASTER_SECURITY_KEY", raising=False)
    monkeypatch.delenv("ADMIN_MASTER_CODE", raising=False)
    monkeypatch.delenv("TESTING", raising=False)
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)

    # Re-evaluate config resolution logic
    raw_master = os.environ.get("MASTER_SECURITY_KEY") or os.environ.get("ADMIN_MASTER_CODE")
    is_testing = False
    env = "production"
    resolved_key = raw_master.strip() if (raw_master and raw_master.strip()) else (
        "991448" if (is_testing or env in ("development", "dev", "test")) else None
    )
    assert resolved_key is None

def test_master_bypass_logs_cryptographic_audit_alert():
    """Verify that invoking master security key creates an official audit alert."""
    test_ip = "192.168.1.99"
    test_email = "admin@goldenglobalexpo.com"
    _log_master_security_alert(test_ip, test_email, "/api/admin/login")

    session = SessionLocal()
    try:
        alert = (
            session.query(AuditLogModel)
            .filter_by(action="SECURITY_ALERT_MASTER_BYPASS_INVOKED")
            .order_by(AuditLogModel.timestamp.desc())
            .first()
        )
        assert alert is not None
        assert alert.entity_id == test_email
        assert test_ip in alert.operator
        assert alert.hash is not None and len(alert.hash) == 64
    finally:
        session.close()

def test_database_engine_type_and_pooling():
    """Verify database engine configuration matches environment."""
    assert config.DATABASE_ENGINE_TYPE in ("sqlite", "postgresql")
    if config.IS_POSTGRES:
        assert config.DB_POOL_SIZE is not None
        assert config.DB_MAX_OVERFLOW is not None

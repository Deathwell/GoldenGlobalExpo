import os
import sys
import pytest
from starlette.testclient import TestClient

# Ensure root directory is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Isolate test data from live production data
TEST_DATA_DIR = os.path.join(BASE_DIR, 'data', 'test_env')
os.makedirs(TEST_DATA_DIR, exist_ok=True)
os.environ['DATA_DIR'] = TEST_DATA_DIR
os.environ['DATABASE_URL'] = f"sqlite:///{os.path.join(TEST_DATA_DIR, 'test_enterprise.db')}"
os.environ['TESTING'] = 'true'
os.environ['SMTP_PASS'] = ''

from backend.app import app
from backend.db import SessionLocal, init_db
from backend.core.security import RATE_LIMITER

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    db_file = os.path.join(TEST_DATA_DIR, 'test_enterprise.db')
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass
    init_db()
    yield

@pytest.fixture(autouse=True)
def reset_rate_limit_state():
    RATE_LIMITER.reset()
    yield
    RATE_LIMITER.reset()

@pytest.fixture(autouse=True)
def suppress_live_email_during_tests(monkeypatch):
    """
    Prevents tests from dispatching real emails to the user's personal Gmail inbox
    via Gmail SMTP during automated test runs.
    """
    monkeypatch.setenv("TESTING", "true")
    monkeypatch.setenv("SMTP_PASS", "")

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

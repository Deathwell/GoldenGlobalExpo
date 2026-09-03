import os
import sys
import pytest
from starlette.testclient import TestClient

# Ensure root directory is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import app
from backend.db import SessionLocal, init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    init_db()
    yield

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

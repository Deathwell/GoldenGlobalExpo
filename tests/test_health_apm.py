"""
Unit Tests for APM Health and Observability Endpoints
"""
import pytest
from starlette.testclient import TestClient
from backend.app import app

client = TestClient(app)

def test_liveness_probe():
    resp = client.get('/api/health')
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'UP'
    assert data['database'] == 'CONNECTED'
    assert isinstance(data['db_latency_ms'], (int, float))
    assert data['db_latency_ms'] < 100.0

def test_deep_apm_diagnostics():
    resp = client.get('/api/health/diagnostics')
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'healthy'
    assert data['version'] == '2.1.0'
    assert 'uptime' in data
    assert 'performance' in data
    assert 'resources' in data
    assert 'system' in data
    assert data['performance']['database_status'] == 'ONLINE (ACID WAL)'
    assert data['resources']['process_ram_mb'] > 0
    assert data['resources']['disk_free_gb'] > 0

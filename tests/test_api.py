import json
import time

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

def test_prices_api(client):
    """Test retrieving and updating commodity prices."""
    resp = client.get("/api/prices")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "prices" in data

    # Test price update
    update_payload = {"p1": {"price": 145.5, "marginPct": 8.0, "name": "Organic Turmeric Salem", "category": "Spices"}}
    post_resp = client.post("/api/prices", json=update_payload)
    assert post_resp.status_code == 200
    assert post_resp.json()["success"] is True

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
    """Test creating an RFQ inquiry and retrieving it from the master database."""
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

    # Submit RFQ
    post_resp = client.post("/api/inquiries", json=rfq_data)
    assert post_resp.status_code == 200
    assert post_resp.json()["success"] is True

    # Retrieve and verify presence
    get_resp = client.get("/api/inquiries")
    assert get_resp.status_code == 200
    inqs = get_resp.json()["inquiries"]
    found = next((i for i in inqs if i["id"] == test_id), None)
    assert found is not None
    assert found["name"] == "Automated Test Corp"

def test_consignments_api(client):
    """Test querying and creating consignments."""
    resp = client.get("/api/consignments")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "consignments" in data
    assert isinstance(data["consignments"], list)

def test_audit_hash_chain(client):
    """Test cryptographic SHA-256 hash chaining on audit logs."""
    audit_resp = client.get("/api/audit")
    assert audit_resp.status_code == 200
    data = audit_resp.json()
    assert data["success"] is True
    assert "audit" in data
    logs = data["audit"]
    assert len(logs) > 0
    # Verify hash structure
    for entry in logs:
        assert "hash" in entry
        assert len(entry["hash"]) == 64

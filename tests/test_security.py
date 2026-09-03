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
    desk_resp = client.get("/desk.html", cookies={"gge_admin_session": token})
    assert desk_resp.status_code == 200
    assert len(desk_resp.content) > 1000

    # Logout
    logout_resp = client.post("/api/auth/logout", cookies={"gge_admin_session": token})
    assert logout_resp.status_code == 200

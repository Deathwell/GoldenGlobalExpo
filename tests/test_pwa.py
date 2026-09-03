"""
Automated Test Suite for Progressive Web App (PWA) Architecture
Verifies /manifest.json, /sw.js, and PWA static assets.
"""

def test_pwa_manifest_endpoint(client):
    """Verify Web App Manifest meets W3C PWA standards."""
    resp = client.get("/manifest.json")
    assert resp.status_code == 200
    assert "application/manifest+json" in resp.headers.get("content-type", "")

    manifest = resp.json()
    assert manifest["name"] == "Golden Global Expo — Institutional Agri Export"
    assert manifest["short_name"] == "GoldenGlobal"
    assert manifest["display"] == "standalone"
    assert manifest["background_color"] == "#0b1320"
    assert manifest["theme_color"] == "#0b1320"
    assert len(manifest["icons"]) >= 2

def test_service_worker_endpoint(client):
    """Verify Service Worker is served with appropriate headers."""
    resp = client.get("/sw.js")
    assert resp.status_code == 200
    assert "application/javascript" in resp.headers.get("content-type", "")
    assert resp.headers.get("Service-Worker-Allowed") == "/"
    
    body = resp.text
    assert "PRECACHE_ASSETS" in body
    assert "gge-pwa-" in body
    assert "addEventListener('install'" in body
    assert "addEventListener('fetch'" in body

def test_pwa_icons_accessible(client):
    """Verify generated PWA icons are publicly reachable."""
    resp_192 = client.get("/images/icon-192.png")
    assert resp_192.status_code == 200

    resp_512 = client.get("/images/icon-512.png")
    assert resp_512.status_code == 200

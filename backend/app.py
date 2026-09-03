"""
Golden Global Expo — Modular ASGI Master Application
Enterprise-grade ASGI orchestrator cleanly assembling domain routers,
OWASP security middlewares, and static asset delivery pipelines.
"""

import os
import sys
import time
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure project root is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.core.config import APP_TITLE, APP_DESCRIPTION, APP_VERSION, raw_emails
from backend.core.security import enterprise_security_middleware
from backend.core.events import broadcast_sse, CONNECTED_SSE_CLIENTS
from backend.core.atomic_io import atomic_json_write
from backend.db import init_db, SessionLocal, AdminSessionModel

# Import Decomposed Domain Routers
from backend.routers.health import router as health_router, set_sse_counter
from backend.routers.prices import router as prices_router
from backend.routers.inquiries import router as inquiries_router
from backend.routers.consignments import router as consignments_router
from backend.routers.audit import router as audit_router
from backend.routers.auth import router as auth_router
from backend.routers.payments import router as payments_router
from backend.routers.stream import router as stream_router

# Initialize database schema and WAL mode
init_db()

tags_metadata = [
    {"name": "APM Health & Observability", "description": "Real-time system diagnostics, database query latency, and resource metrics."},
    {"name": "Commodity Prices & Forex", "description": "ACID transactional matrix for agricultural commodities, dynamic margins, and FX rates."},
    {"name": "Commercial Inquiries & RFQ", "description": "Commercial bulk RFQs, 500g sample reservations, and buyer pipelines."},
    {"name": "Consignments & Maritime Tracking", "description": "6-stage customs and ocean shipment telemetry, high-security bolt seals, and digital vaults."},
    {"name": "Compliance Audit Ledger", "description": "Tamper-evident SHA-256 cryptographic audit chain for regulatory inspection."},
    {"name": "Executive Authentication", "description": "Cryptographically signed sessions, 2FA OTPs, and RBAC token authentication."},
    {"name": "Commercial Sample Payments", "description": "Interactive payment gateways, Razorpay order creation, and webhooks."},
    {"name": "Real-Time Event Streaming", "description": "Zero-lag Server-Sent Events (SSE) push streaming for live desks."}
]

app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    openapi_tags=tags_metadata,
    contact={
        "name": "Golden Global Expo Compliance Desk",
        "email": raw_emails.split(",")[0].strip(),
    }
)

# Connect SSE client counter to health diagnostics
set_sse_counter(lambda: len(CONNECTED_SSE_CLIENTS))

# 1. Register OWASP Defense Middleware
app.middleware("http")(enterprise_security_middleware)

# 2. Register Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount Decomposed Domain Routers
app.include_router(health_router)
app.include_router(prices_router)
app.include_router(inquiries_router)
app.include_router(consignments_router)
app.include_router(audit_router)
app.include_router(auth_router)
app.include_router(payments_router)
app.include_router(stream_router)

# 4. Portal Route Gates & HTML Delivery
@app.get("/")
@app.get("/index.html")
async def serve_index():
    return FileResponse(os.path.join(BASE_DIR, 'index.html'))

@app.get("/login.html")
async def serve_login():
    return FileResponse(os.path.join(BASE_DIR, 'login.html'))

@app.get("/desk.html")
async def serve_desk(request: Request):
    """Server-side route gate: redirects unauthenticated users to /login.html."""
    token = request.cookies.get("gge_admin_session")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return RedirectResponse(url="/login.html?redirect=/desk.html", status_code=302)

    session = SessionLocal()
    try:
        rec = session.query(AdminSessionModel).filter_by(token=token).first()
        if not rec or time.time() > rec.expires_at:
            return RedirectResponse(url="/login.html?redirect=/desk.html&reason=expired", status_code=302)
    finally:
        session.close()

    return FileResponse(os.path.join(BASE_DIR, 'desk.html'))

@app.get("/tracking.html")
async def serve_tracking():
    return FileResponse(os.path.join(BASE_DIR, 'tracking.html'))

@app.get("/download.html")
async def serve_download():
    return FileResponse(os.path.join(BASE_DIR, 'download.html'))

# 5. Static Asset Pipelines
for static_dir in ['css', 'js', 'images', 'data', 'docs']:
    dir_path = os.path.join(BASE_DIR, static_dir)
    if os.path.exists(dir_path):
        app.mount(f"/{static_dir}", StaticFiles(directory=dir_path), name=static_dir)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

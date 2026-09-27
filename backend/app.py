"""
Golden Global Expo — Application Server
Core ASGI application coordinating domain routers, security middleware,
and static asset delivery.
"""

import os
import sys
import time
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure project root is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.core.config import (
    APP_TITLE, APP_DESCRIPTION, APP_VERSION, raw_emails,
    ALLOWED_ORIGINS, ALLOWED_ORIGIN_REGEX
)
from backend.core.security import enterprise_security_middleware, HardenedCORSMiddleware, get_client_ip, async_get_client_geo, RATE_LIMITER
from backend.core.events import broadcast_sse, CONNECTED_SSE_CLIENTS
from backend.core.atomic_io import atomic_json_write
from backend.db import init_db, SessionLocal, AdminSessionModel

# Domain Routers
from backend.routers.health import router as health_router, set_sse_counter, healthz_liveness, readyz_readiness
from backend.routers.prices import router as prices_router
from backend.routers.inquiries import router as inquiries_router
from backend.routers.consignments import router as consignments_router
from backend.routers.audit import router as audit_router
from backend.routers.auth import router as auth_router
from backend.routers.payments import router as payments_router
from backend.routers.domestic import router as domestic_router
from backend.routers.stream import router as stream_router
from backend.routers.documents import router as documents_router
from backend.routers.commodities import router as commodities_router

# Initialize database schema and WAL mode
init_db()

tags_metadata = [
    {"name": "System Health", "description": "Liveness probes, database latency, and system telemetry."},
    {"name": "Commodity Pricing", "description": "Commodity price schedules, margins, and currency rates."},
    {"name": "Inquiries & RFQs", "description": "Commercial inquiries and buyer requests."},
    {"name": "Consignments & Tracking", "description": "Shipment milestones, container telemetry, and documentation."},
    {"name": "Audit Ledger", "description": "Cryptographic SHA-256 audit verification logs."},
    {"name": "Authentication", "description": "Session authentication and verification."},
    {"name": "Payments", "description": "Sample orders and checkout processing."},
    {"name": "Event Stream", "description": "Server-Sent Events for real-time dashboard updates."}
]

from contextlib import asynccontextmanager
from backend.routers.prices import sync_forex_daily_background_task

@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    task = asyncio.create_task(sync_forex_daily_background_task())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    openapi_tags=tags_metadata,
    lifespan=lifespan,
    contact={
        "name": "Golden Global Expo Compliance Desk",
        "email": raw_emails.split(",")[0].strip(),
    }
)

# Connect SSE client counter to health diagnostics
set_sse_counter(lambda: len(CONNECTED_SSE_CLIENTS))

# 1. Register OWASP Defense Middleware
app.middleware("http")(enterprise_security_middleware)

# 2. Register Cross-Origin Resource Sharing (CORS) with strict origin validation
app.add_middleware(
    HardenedCORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["Content-Type", "Authorization", "ngrok-skip-browser-warning", "X-Requested-With"],
    expose_headers=["Content-Disposition", "Content-Length", "Retry-After"],
)

# 3. Mount Decomposed Domain Routers
app.include_router(health_router)
app.include_router(prices_router)
app.include_router(inquiries_router)
app.include_router(consignments_router)
app.include_router(audit_router)
app.include_router(auth_router)
app.include_router(payments_router)
app.include_router(domestic_router)
app.include_router(stream_router)
app.include_router(documents_router)
app.include_router(commodities_router)

# --- Standardized Kubernetes / Cloud Liveness & Readiness Probes ---
@app.get("/healthz", tags=["System Health"])
async def root_healthz():
    """Root standardized liveness probe."""
    return await healthz_liveness()

@app.get("/readyz", tags=["System Health"])
async def root_readyz():
    """Root standardized readiness probe verifying database connectivity and storage health."""
    return await readyz_readiness()

# --- Structured JSON Error-Handling Middleware & Exception Handlers ---
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    headers = getattr(exc, "headers", None) or {}
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": str(exc.detail),
            "detail": str(exc.detail),
            "statusCode": exc.status_code,
            "timestamp": time.time(),
            "path": request.url.path
        },
        headers=headers
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logging.error(f"[UNHANDLED EXCEPTION] Path: {request.url.path} Error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "An internal server error occurred. Please contact the Trade Desk administrator.",
            "detail": "Internal Server Error",
            "statusCode": 500,
            "timestamp": time.time(),
            "path": request.url.path
        }
    )


# Real-time client IP & telemetry resolver
@app.get("/api/get-ip", tags=["System Health"])
async def get_ip_endpoint(request: Request):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("get-ip-endpoint", client_ip, max_requests=60, window_seconds=60)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": f"Rate limit exceeded. Please retry in {retry_after} seconds.", "retryAfter": retry_after},
            headers={"Retry-After": str(retry_after)}
        )

    geo_data = await async_get_client_geo(client_ip)
    ua = request.headers.get("user-agent", "")
    browser = "Modern Browser"
    if "Firefox" in ua: browser = "Mozilla Firefox"
    elif "Edg" in ua: browser = "Microsoft Edge"
    elif "Chrome" in ua: browser = "Google Chrome"
    elif "Safari" in ua: browser = "Apple Safari"

    os_name = "Desktop Workstation"
    if "Windows" in ua: os_name = "Windows"
    elif "Macintosh" in ua or "Mac OS" in ua: os_name = "macOS"
    elif "Android" in ua: os_name = "Android Mobile"
    elif "iPhone" in ua or "iPad" in ua: os_name = "iOS Mobile"
    elif "Linux" in ua: os_name = "Linux"

    return {
        "success": True,
        "ip": client_ip,
        "origin": f"{geo_data.get('city', 'Mumbai')}, {geo_data.get('region', 'Maharashtra')}, {geo_data.get('country', 'India')}",
        "city": geo_data.get("city", "Mumbai"),
        "country": geo_data.get("country", "India"),
        "isp": geo_data.get("isp", "Direct Trade Network"),
        "vpnStatus": geo_data.get("vpnStatus", "Clean Commercial / Residential IP"),
        "vpnDetected": geo_data.get("vpnDetected", False),
        "browser": browser,
        "os": os_name
    }

# 4. PWA Manifest & Service Worker Delivery
@app.get("/manifest.json")
async def serve_manifest():
    return FileResponse(
        os.path.join(BASE_DIR, 'manifest.json'),
        media_type="application/manifest+json"
    )

@app.get("/sw.js")
async def serve_sw():
    return FileResponse(
        os.path.join(BASE_DIR, 'sw.js'),
        media_type="application/javascript",
        headers={
            "Service-Worker-Allowed": "/",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
        }
    )

@app.get("/favicon.ico")
async def serve_favicon():
    return FileResponse(
        os.path.join(BASE_DIR, 'images', 'icon-192.png'),
        media_type="image/png"
    )

# 5. Portal Route Gates & HTML Delivery
@app.get("/")
@app.get("/index.html")
@app.get("/index")
async def serve_index():
    return FileResponse(
        os.path.join(BASE_DIR, 'index.html'),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
        }
    )

@app.get("/login.html")
@app.get("/login")
async def serve_login():
    return FileResponse(os.path.join(BASE_DIR, 'login.html'))

@app.get("/desk.html")
@app.get("/desk")
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

    return FileResponse(
        os.path.join(BASE_DIR, 'desk.html'),
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache"
        }
    )

@app.get("/tracking.html")
@app.get("/tracking")
async def serve_tracking():
    return FileResponse(os.path.join(BASE_DIR, 'tracking.html'))

@app.get("/download.html")
@app.get("/download")
async def serve_download():
    return FileResponse(os.path.join(BASE_DIR, 'download.html'))

@app.get("/verify.html")
@app.get("/verify")
async def serve_verify():
    return FileResponse(os.path.join(BASE_DIR, 'verify.html'))

# 5b. Uncached Admin & Dynamic Scripts Delivery
@app.get("/js/desk.js")
async def serve_desk_js():
    return FileResponse(
        os.path.join(BASE_DIR, 'js', 'desk.js'),
        media_type="application/javascript",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache"}
    )

@app.get("/css/desk.css")
async def serve_desk_css():
    return FileResponse(
        os.path.join(BASE_DIR, 'css', 'desk.css'),
        media_type="text/css",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache"}
    )

# 6. Static Asset Pipelines (Zero-Exposure: 'data', 'docs', 'uploads' isolated from anonymous direct browsing)
for static_dir in ['css', 'js', 'images', 'videos', 'audio']:
    dir_path = os.path.join(BASE_DIR, static_dir)
    if os.path.exists(dir_path):
        app.mount(f"/{static_dir}", StaticFiles(directory=dir_path), name=static_dir)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

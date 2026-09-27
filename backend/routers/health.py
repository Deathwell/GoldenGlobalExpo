"""
Golden Global Expo — Health & APM Diagnostics Router
Exposes /api/health and /api/health/diagnostics for DevOps, Uptime Monitors, and Admin Telemetry.
"""

from fastapi import APIRouter, Depends
from backend.services.telemetry_service import get_system_diagnostics, get_db_latency_ms

router = APIRouter(prefix="/api/health", tags=["APM Health & Observability"])

# Function to get active SSE client count injected from app.py
_sse_counter_callable = lambda: 0

def set_sse_counter(callable_fn):
    global _sse_counter_callable
    _sse_counter_callable = callable_fn

import os
import time
from fastapi.responses import JSONResponse
from backend.core.config import APP_TITLE, APP_VERSION, SERVER_START_TIME, DATA_DIR

@router.get("")
@router.get("/live")
async def liveness_probe():
    """
    Standard high-speed liveness and readiness probe for load balancers (Cloudflare, Nginx, AWS ALB).
    Returns HTTP 200 with minimal payload, or 503 if database is unreachable.
    """
    db_latency = get_db_latency_ms()
    if db_latency < 0:
        return JSONResponse(status_code=503, content={
            "status": "DEGRADED",
            "database": "DISCONNECTED",
            "db_latency_ms": -1.0
        })
    return {
        "status": "UP",
        "database": "CONNECTED",
        "db_latency_ms": db_latency
    }

@router.get("/healthz")
async def healthz_liveness():
    """
    Standard Kubernetes/Docker liveness probe.
    Returns HTTP 200 immediately verifying process event loop is active.
    """
    now = time.time()
    uptime_sec = int(now - SERVER_START_TIME) if SERVER_START_TIME else 0
    return {
        "status": "ok",
        "app": APP_TITLE,
        "version": APP_VERSION,
        "timestamp": now,
        "uptimeSeconds": uptime_sec
    }

@router.get("/readyz")
async def readyz_readiness():
    """
    Standard Kubernetes/Docker readiness probe.
    Verifies database connectivity, latency, and disk storage access. Returns HTTP 503 if degraded.
    """
    now = time.time()
    db_latency = get_db_latency_ms()
    storage_ok = os.path.exists(str(DATA_DIR)) and os.access(str(DATA_DIR), os.W_OK)
    checks = {
        "database": "UP" if db_latency >= 0 else "DOWN",
        "storage": "UP" if storage_ok else "DEGRADED"
    }
    if db_latency < 0 or not storage_ok:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unready",
                "database": "DISCONNECTED" if db_latency < 0 else "CONNECTED",
                "db_latency_ms": db_latency,
                "storage": "WRITABLE" if storage_ok else "READONLY",
                "timestamp": now,
                "checks": checks
            }
        )
    return {
        "status": "ready",
        "database": "CONNECTED",
        "db_latency_ms": db_latency,
        "storage": "WRITABLE",
        "timestamp": now,
        "checks": checks
    }

@router.get("/diagnostics")
async def deep_apm_diagnostics():
    """
    Deep application performance monitoring (APM) telemetry.
    Returns database latency, process memory, CPU utilization, active SSE clients, and WAL metrics.
    """
    sse_count = _sse_counter_callable() if _sse_counter_callable else 0
    return get_system_diagnostics(active_sse_clients_count=sse_count)


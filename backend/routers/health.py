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

@router.get("")
async def liveness_probe():
    """
    Standard high-speed liveness and readiness probe for load balancers (Cloudflare, Nginx, AWS ALB).
    Returns HTTP 200 with minimal payload.
    """
    db_latency = get_db_latency_ms()
    return {
        "status": "UP",
        "database": "CONNECTED",
        "db_latency_ms": db_latency
    }

@router.get("/diagnostics")
async def deep_apm_diagnostics():
    """
    Deep application performance monitoring (APM) telemetry.
    Returns database latency, process memory, CPU utilization, active SSE clients, and WAL metrics.
    """
    sse_count = _sse_counter_callable() if _sse_counter_callable else 0
    return get_system_diagnostics(active_sse_clients_count=sse_count)

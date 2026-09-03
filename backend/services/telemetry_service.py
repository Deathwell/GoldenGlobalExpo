"""
Golden Global Expo — Real-Time APM & Telemetry Service
Monitors database query latency, process RAM/CPU footprint, active SSE connections, and disk status.
"""

import os
import time
import platform
import threading
import psutil
from sqlalchemy import text
from backend.db import SessionLocal, DB_PATH
from backend.core.config import SERVER_START_TIME, APP_VERSION

def get_db_latency_ms() -> float:
    """Measures exact execution round-trip latency of an ACID SQLite probe query."""
    start = time.perf_counter()
    session = SessionLocal()
    try:
        session.execute(text("SELECT 1;"))
        session.commit()
    finally:
        session.close()
    return round((time.perf_counter() - start) * 1000.0, 3)

def get_system_diagnostics(active_sse_clients_count: int = 0) -> dict:
    """Compiles comprehensive APM diagnostics telemetry."""
    now = time.time()
    uptime_sec = int(now - SERVER_START_TIME) if SERVER_START_TIME else 0
    days, rem = divmod(uptime_sec, 86400)
    hours, rem = divmod(rem, 3600)
    mins, secs = divmod(rem, 60)
    uptime_human = f"{days}d {hours}h {mins}m {secs}s" if days > 0 else f"{hours}h {mins}m {secs}s"

    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    ram_mb = round(mem_info.rss / (1024 * 1024), 2)
    cpu_pct = process.cpu_percent(interval=0.05)

    # SQLite File Telemetry
    db_size_kb = 0
    wal_size_kb = 0
    wal_active = False
    if os.path.exists(DB_PATH):
        db_size_kb = round(os.path.getsize(DB_PATH) / 1024, 2)
    wal_path = str(DB_PATH) + "-wal"
    if os.path.exists(wal_path):
        wal_size_kb = round(os.path.getsize(wal_path) / 1024, 2)
        wal_active = True

    # DB Latency
    db_latency = get_db_latency_ms()

    # Disk Telemetry
    disk = psutil.disk_usage(os.path.abspath('.'))
    disk_free_gb = round(disk.free / (1024**3), 2)
    disk_used_pct = disk.percent

    return {
        "status": "healthy",
        "version": APP_VERSION,
        "environment": "production",
        "timestamp": now,
        "uptime": {
            "seconds": uptime_sec,
            "formatted": uptime_human
        },
        "performance": {
            "database_latency_ms": db_latency,
            "database_status": "ONLINE (ACID WAL)",
            "wal_active": wal_active,
            "active_threads": threading.active_count(),
            "active_sse_streams": active_sse_clients_count
        },
        "resources": {
            "process_ram_mb": ram_mb,
            "process_cpu_percent": cpu_pct,
            "database_file_kb": db_size_kb,
            "database_wal_kb": wal_size_kb,
            "disk_free_gb": disk_free_gb,
            "disk_used_percent": disk_used_pct
        },
        "system": {
            "os": platform.system(),
            "os_release": platform.release(),
            "python_version": platform.python_version(),
            "pid": os.getpid()
        }
    }

"""
Golden Global Expo — Core Configuration Module
Centralizes typed environment variables, directory paths, and operational thresholds.
"""

import os
import re
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

APP_TITLE = "Golden Global Expo — Institutional Export API"
APP_DESCRIPTION = (
    "High-concurrency asynchronous ASGI API engine with ACID persistence, "
    "cryptographic audit chains, real-time SSE telemetry, and APM health monitoring."
)
APP_VERSION = "2.1.0"

MAX_BODY_SIZE = int(os.environ.get("MAX_BODY_SIZE", 15 * 1024 * 1024))
SESSION_EXPIRE_SECONDS = int(os.environ.get("SESSION_EXPIRE_SECONDS", 86400))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "GoldenAdmin2026!")
ADMIN_MASTER_CODE = os.environ.get("ADMIN_MASTER_CODE", "991448")

raw_emails = os.environ.get("ADMIN_EMAILS", "nigadearyan@gmail.com")
AUTHORIZED_ADMIN_EMAILS = {e.strip().lower() for e in re.split(r'[,; ]+', raw_emails) if e.strip()}

DB_PATH = DATA_DIR / "enterprise.db"
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH}")

SERVER_START_TIME = time.time()

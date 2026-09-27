"""
Golden Global Expo — Configuration
Environment variables, storage paths, and service configuration.
"""

import os
import re
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

APP_TITLE = "Golden Global Expo API"
APP_DESCRIPTION = (
    "Asynchronous trade and logistics API providing commodity pricing, "
    "inquiry management, cargo tracking, and audit logging."
)
APP_VERSION = "2.5.0"


ENVIRONMENT = os.environ.get("ENVIRONMENT", "production").lower()
IS_TESTING = (
    os.environ.get("TESTING", "").lower() in ("true", "1", "yes")
    or "PYTEST_CURRENT_TEST" in os.environ
    or "pytest" in sys.modules
)

MAX_BODY_SIZE = int(os.environ.get("MAX_BODY_SIZE", 15 * 1024 * 1024))
SESSION_EXPIRE_SECONDS = int(os.environ.get("SESSION_EXPIRE_SECONDS", 86400))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "GoldenAdmin2026!")

# Master Emergency Security Key:
# In institutional audits, hardcoded master credentials fail pen-tests.
# Must be configured explicitly via MASTER_SECURITY_KEY or ADMIN_MASTER_CODE in .env.
# If unset in production, emergency master bypass is completely disabled (None).
# In testing and local dev mode, defaults to test key for non-regression test harnesses.
raw_master = os.environ.get("MASTER_SECURITY_KEY") or os.environ.get("ADMIN_MASTER_CODE")
if raw_master and raw_master.strip():
    ADMIN_MASTER_CODE = raw_master.strip()
elif IS_TESTING or ENVIRONMENT in ("development", "dev", "test"):
    ADMIN_MASTER_CODE = "991448"  # Non-production test harness fallback
else:
    ADMIN_MASTER_CODE = None  # Disabled by default in production

MASTER_SECURITY_KEY = ADMIN_MASTER_CODE
LOGISTICS_PASSWORD = os.environ.get("LOGISTICS_PASSWORD", "Logistics2026!")

raw_emails = os.environ.get("ADMIN_EMAILS", "admin@goldenglobalexpo.com,nigadearyan@gmail.com")
AUTHORIZED_ADMIN_EMAILS = {e.strip().lower() for e in re.split(r'[,; ]+', raw_emails) if e.strip()}
AUTHORIZED_LOGISTICS_EMAILS = {"logistics@goldenglobalexpo.com", "ops@goldenglobalexpo.com"}

DB_PATH = DATA_DIR / "enterprise.db"
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH}")
IS_POSTGRES = DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgres")
DATABASE_ENGINE_TYPE = "postgresql" if IS_POSTGRES else "sqlite"
DB_POOL_SIZE = int(os.environ.get("DB_POOL_SIZE", "10")) if IS_POSTGRES else None
DB_MAX_OVERFLOW = int(os.environ.get("DB_MAX_OVERFLOW", "20")) if IS_POSTGRES else None
DB_POOL_RECYCLE = int(os.environ.get("DB_POOL_RECYCLE", "1800")) if IS_POSTGRES else None
REDIS_URL = os.environ.get("REDIS_URL", "").strip() or None

SERVER_START_TIME = time.time()

DEFAULT_SAMPLE_PRICE_INR = float(os.environ.get("DEFAULT_SAMPLE_PRICE_INR", 499.0))
UPI_VPA = os.environ.get("UPI_VPA", "goldenglobalexpo@icici")
UPI_PAYEE_NAME = os.environ.get("UPI_PAYEE_NAME", "Golden Global Expo")
FOREX_UPSTREAM_URL = os.environ.get("FOREX_UPSTREAM_URL", "https://open.er-api.com/v6/latest/USD")
FOREX_CACHE_TTL_SECONDS = int(os.environ.get("FOREX_CACHE_TTL_SECONDS", 1800))

# CORS Allowed Origins Configuration
raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:8000,http://127.0.0.1:8000,http://0.0.0.0:8000,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500,https://goldenglobalexpo.com,https://www.goldenglobalexpo.com"
)
ALLOWED_ORIGINS = [o.strip() for o in re.split(r'[,; ]+', raw_origins) if o.strip()]
ALLOWED_ORIGIN_REGEX = os.environ.get(
    "ALLOWED_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$|^https?://([a-zA-Z0-9-]+\.)*goldenglobalexpo\.com(:\d+)?$|^https?://([a-zA-Z0-9-]+\.)*ngrok(-free)?\.(app|io)(:\d+)?$"
)
_origin_compiled_regex = re.compile(ALLOWED_ORIGIN_REGEX, re.IGNORECASE) if ALLOWED_ORIGIN_REGEX else None

def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    if origin == "http://testserver" or origin in ALLOWED_ORIGINS or "*" in ALLOWED_ORIGINS:
        return True
    if _origin_compiled_regex and _origin_compiled_regex.match(origin):
        return True
    return False


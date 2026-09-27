import os
import sys
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if __name__ == '__main__':
    PORT = int(os.environ.get("PORT", 8000))
    print("=" * 68)
    print("  GOLDEN GLOBAL EXPO — ENTERPRISE PRODUCTION ASGI SERVER")
    print("  FastAPI Engine · SQLAlchemy (SQLite WAL Mode) · Uvicorn")
    print(f"  Listening on http://0.0.0.0:{PORT}")
    print("=" * 68)
    backend_dir = os.path.join(BASE_DIR, "backend")
    is_dev = os.environ.get("ENVIRONMENT", "production").lower() != "production" or os.environ.get("DEBUG", "False").lower() == "true"
    
    # Only reload when in development mode and backend source files change
    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=PORT,
        log_level="info",
        access_log=True,
        reload=is_dev,
        reload_dirs=[backend_dir] if is_dev else None,
        reload_excludes=["data/*", "uploads/*", "*.db*", "*.wal", "*.json", "*.pdf", "*.png", "*.jpg", "*.jpeg", "scratch/*", "backups/*"] if is_dev else None
    )


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
    uvicorn.run("backend.app:app", host="0.0.0.0", port=PORT, log_level="info", access_log=True)

"""
Golden Global Expo — Centralized Authentication & RBAC Dependency
Enforces zero-trust session validation across all administrative APIs.
"""
import time
from typing import Optional, List
from fastapi import Request, HTTPException, Depends
from backend.db import SessionLocal, AdminSessionModel

def get_current_user_from_request(request: Request) -> Optional[dict]:
    token = request.cookies.get("gge_admin_session")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return None

    session = SessionLocal()
    try:
        now = time.time()
        rec = session.query(AdminSessionModel).filter_by(token=token).first()
        if not rec:
            return None
        if now > rec.expires_at:
            try:
                session.delete(rec)
                session.commit()
            except Exception:
                pass
            return None
        return {
            "token": rec.token,
            "email": rec.email,
            "role": rec.role or "admin",
            "created_at": rec.created_at,
            "expires_at": rec.expires_at
        }
    finally:
        session.close()

def require_auth(allowed_roles: Optional[List[str]] = None):
    async def dependency(request: Request) -> dict:
        user = get_current_user_from_request(request)
        if not user:
            raise HTTPException(
                status_code=401, 
                detail="Authentication required: Access denied. Please log in with valid credentials."
            )
        if allowed_roles and user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access forbidden: Insufficient permissions for role '{user.get('role')}'. Required: {allowed_roles}"
            )
        return user
    return dependency

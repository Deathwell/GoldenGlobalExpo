"""
Golden Global Expo — Executive Authentication & Session Router
"""
import time
import secrets
import hmac
from fastapi import APIRouter, Request, Response, BackgroundTasks
from fastapi.responses import JSONResponse
from backend.core.config import (
    AUTHORIZED_ADMIN_EMAILS, ADMIN_MASTER_CODE, ADMIN_PASSWORD, SESSION_EXPIRE_SECONDS
)
from backend.services.email_service import background_send_email_task
from backend.db import SessionLocal, AdminSessionModel

router = APIRouter(tags=["Executive Authentication"])

ACTIVE_OTPS = {}

@router.post("/api/auth/request-otp")
async def request_otp(request: Request, background_tasks: BackgroundTasks):
    try:
        data = await request.json()
        email = data.get("email", "").strip().lower()

        if not email or email not in AUTHORIZED_ADMIN_EMAILS:
            return JSONResponse(status_code=403, content={
                "success": False,
                "error": "Access Denied: This email address is not registered in the Executive Authorization Registry."
            })

        otp = f"{secrets.randbelow(900000) + 100000}"
        ACTIVE_OTPS[email] = {
            "code": otp,
            "expires_at": time.time() + 600,
            "attempts": 0
        }

        print(f"\n[SECURITY AUDIT] OTP Generated for {email}: >>> {otp} <<< (Expires in 10m)\n")

        email_data = {
            "to": email,
            "toName": "Executive Officer",
            "subject": f"GGE Executive Desk — One-Time Security Access Code [{otp}]",
            "body": f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #D4AF37; border-radius: 8px;">
              <h2 style="color: #0b1320; margin-bottom: 8px;">Executive Portal Authentication</h2>
              <p style="color: #4A5568; font-size: 14px;">A sign-in request was initiated for your Golden Global Expo Executive Trade Desk account.</p>
              <div style="background: #FAF7EE; border: 2px dashed #D4AF37; padding: 16px; text-align: center; margin: 20px 0; border-radius: 6px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0b1320;">{otp}</span>
              </div>
              <p style="color: #718096; font-size: 12px;">This authorization code will expire in 10 minutes. If you did not initiate this request, contact compliance immediately.</p>
            </div>
            """
        }
        background_tasks.add_task(background_send_email_task, email_data)

        return {
            "success": True,
            "message": f"Secure one-time verification code dispatched to {email}.",
            "email": email
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@router.post("/api/auth/verify-otp")
async def verify_otp(request: Request, response: Response):
    try:
        data = await request.json()
        email = data.get("email", "").strip().lower()
        code = str(data.get("otp") or data.get("code") or "").strip()

        if not email or not code:
            return JSONResponse(status_code=400, content={"success": False, "error": "Email and security code are required."})

        record = ACTIVE_OTPS.get(email)
        is_master = (code == ADMIN_MASTER_CODE)

        if not is_master:
            if not record:
                return JSONResponse(status_code=400, content={"success": False, "error": "No pending authorization request found. Please request a new code."})
            if time.time() > record["expires_at"]:
                del ACTIVE_OTPS[email]
                return JSONResponse(status_code=400, content={"success": False, "error": "Security code has expired. Please request a new code."})
            if record["code"] != code:
                record["attempts"] += 1
                if record["attempts"] >= 5:
                    del ACTIVE_OTPS[email]
                    return JSONResponse(status_code=429, content={"success": False, "error": "Too many invalid attempts. Security code revoked."})
                return JSONResponse(status_code=400, content={"success": False, "error": f"Invalid security code. {5 - record['attempts']} attempts remaining."})

        if email in ACTIVE_OTPS:
            del ACTIVE_OTPS[email]

        token = secrets.token_hex(32)
        now = time.time()
        expires_at = now + SESSION_EXPIRE_SECONDS

        session = SessionLocal()
        try:
            admin_email = email if email in AUTHORIZED_ADMIN_EMAILS else (list(AUTHORIZED_ADMIN_EMAILS)[0] if AUTHORIZED_ADMIN_EMAILS else email)
            session.add(AdminSessionModel(
                token=token,
                email=admin_email,
                created_at=now,
                expires_at=expires_at
            ))
            session.commit()
        finally:
            session.close()

        response.set_cookie(
            key="gge_admin_session",
            value=token,
            max_age=SESSION_EXPIRE_SECONDS,
            httponly=True,
            samesite="lax",
            secure=False
        )

        return {
            "success": True,
            "message": "Executive session authenticated.",
            "token": token,
            "email": email,
            "expiresAt": expires_at,
            "expiresIn": SESSION_EXPIRE_SECONDS
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@router.post("/api/admin/login")
@router.post("/api/auth/login")
async def admin_password_login(request: Request, response: Response):
    try:
        data = await request.json()
        password = str(data.get("password", "")).strip()
        email = str(data.get("email", "admin@goldenglobalexpo.com")).strip().lower()

        is_email_valid = (email in AUTHORIZED_ADMIN_EMAILS) or ('admin' in email) or (not AUTHORIZED_ADMIN_EMAILS)
        is_password_valid = hmac.compare_digest(password, ADMIN_PASSWORD) or (password == ADMIN_MASTER_CODE)

        if not (is_email_valid and is_password_valid):
            return JSONResponse(status_code=401, content={"success": False, "error": "Invalid Executive Password."})

        token = secrets.token_hex(32)
        now = time.time()
        expires_at = now + SESSION_EXPIRE_SECONDS

        session = SessionLocal()
        try:
            active_email = email if email in AUTHORIZED_ADMIN_EMAILS else (list(AUTHORIZED_ADMIN_EMAILS)[0] if AUTHORIZED_ADMIN_EMAILS else email)
            session.add(AdminSessionModel(
                token=token,
                email=active_email,
                created_at=now,
                expires_at=expires_at
            ))
            session.commit()
        finally:
            session.close()

        response.set_cookie(
            key="gge_admin_session",
            value=token,
            max_age=SESSION_EXPIRE_SECONDS,
            httponly=True,
            samesite="lax",
            secure=False
        )

        return {
            "success": True,
            "message": "Executive session granted.",
            "token": token,
            "email": email,
            "expiresAt": expires_at
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@router.get("/api/auth/validate-session")
async def validate_session(request: Request):
    token = request.cookies.get("gge_admin_session")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return JSONResponse(status_code=401, content={"valid": False, "error": "No session token provided."})

    session = SessionLocal()
    try:
        rec = session.query(AdminSessionModel).filter_by(token=token).first()
        if not rec or time.time() > rec.expires_at:
            return JSONResponse(status_code=401, content={"valid": False, "error": "Session expired or invalid."})
        return {"valid": True, "email": rec.email, "expiresAt": rec.expires_at}
    finally:
        session.close()

@router.get("/api/auth/logout")
@router.post("/api/auth/logout")
async def admin_logout(request: Request, response: Response):
    token = request.cookies.get("gge_admin_session")
    if token:
        session = SessionLocal()
        try:
            rec = session.query(AdminSessionModel).filter_by(token=token).first()
            if rec:
                session.delete(rec)
                session.commit()
        finally:
            session.close()

    response.delete_cookie("gge_admin_session")
    return {"success": True, "message": "Logged out successfully."}

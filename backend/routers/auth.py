"""
Golden Global Expo — Executive Authentication & Session Router
"""
import os
import json
import time
import secrets
import hmac
from fastapi import APIRouter, Request, Response, BackgroundTasks
from fastapi.responses import JSONResponse
from backend.core.config import (
    AUTHORIZED_ADMIN_EMAILS, ADMIN_MASTER_CODE, ADMIN_PASSWORD, 
    LOGISTICS_PASSWORD, AUTHORIZED_LOGISTICS_EMAILS, SESSION_EXPIRE_SECONDS
)
from backend.core.security import RATE_LIMITER, get_client_ip
from backend.services.email_service import background_send_email_task
from backend.db import SessionLocal, AdminSessionModel, ActiveOtpModel

router = APIRouter(tags=["Executive Authentication"])

def _log_master_security_alert(client_ip: str, email: str, endpoint: str):
    """Logs high-priority cryptographic security alert when master emergency key is used."""
    session = SessionLocal()
    try:
        from backend.repositories.audit_repo import AuditRepository
        repo = AuditRepository(session)
        repo.append_entry(
            operator=f"EMERGENCY_MASTER_KEY:{client_ip}",
            action="SECURITY_ALERT_MASTER_BYPASS_INVOKED",
            entity_id=email,
            prev_state="LOCKED",
            new_state="EMERGENCY_ACCESS_GRANTED",
            details=f"Master emergency security bypass key invoked at {endpoint} for account {email} from IP {client_ip}."
        )
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"[SECURITY ALERT WARNING] Could not commit audit entry for master bypass: {e}")
    finally:
        session.close()

def _prune_active_otps(session=None):
    now = time.time()
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True
    try:
        session.query(ActiveOtpModel).filter(ActiveOtpModel.expires_at < now).delete()
        session.commit()
    except Exception:
        session.rollback()
    finally:
        if close_session:
            session.close()

@router.post("/api/auth/request-otp")
async def request_otp(request: Request, background_tasks: BackgroundTasks):
    try:
        client_ip = get_client_ip(request)
        allowed, retry_after = RATE_LIMITER.is_allowed("request-otp", client_ip, max_requests=4, window_seconds=600)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": f"Rate limit exceeded: Maximum 4 OTP requests allowed per 10 minutes. Please wait {retry_after} seconds.",
                    "retryAfter": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )

        try:
            data = await request.json()
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

        email = data.get("email", "").strip().lower()

        if not email or email not in AUTHORIZED_ADMIN_EMAILS:
            return JSONResponse(status_code=403, content={
                "success": False,
                "error": "Access Denied: This email address is not registered in the Executive Authorization Registry."
            })

        otp = f"{secrets.randbelow(900000) + 100000}"
        now = time.time()

        session = SessionLocal()
        should_send_email = True
        try:
            _prune_active_otps(session)
            otp_record = session.query(ActiveOtpModel).filter_by(email=email).first()
            if otp_record:
                # Anti-flood: If an OTP was already dispatched to this email in the last 30s, reuse it
                if (now - (otp_record.created_at or 0) < 30) and ((otp_record.expires_at or 0) > now):
                    otp = otp_record.code
                    should_send_email = False
                    print(f"[OTP THROTTLE] Active OTP for {email} was created {int(now - otp_record.created_at)}s ago. Reused code & suppressed duplicate email.")
                else:
                    otp_record.code = otp
                    otp_record.expires_at = now + 600
                    otp_record.attempts = 0
                    otp_record.created_at = now
            else:
                session.add(ActiveOtpModel(
                    email=email,
                    code=otp,
                    expires_at=now + 600,
                    attempts=0,
                    created_at=now
                ))
            try:
                session.commit()
            except Exception:
                session.rollback()
                # Concurrent worker race condition: update existing row
                otp_record = session.query(ActiveOtpModel).filter_by(email=email).first()
                if otp_record:
                    if (now - (otp_record.created_at or 0) < 30) and ((otp_record.expires_at or 0) > now):
                        otp = otp_record.code
                        should_send_email = False
                    else:
                        otp_record.code = otp
                        otp_record.expires_at = now + 600
                        otp_record.attempts = 0
                        otp_record.created_at = now
                    session.commit()
                else:
                    raise
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

        print(f"\n[SECURITY AUDIT] OTP Generated for {email}: >>> {otp} <<< (Expires in 10m)\n")

        if should_send_email:
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
        else:
            print(f"[OTP AUDIT] Duplicate email to {email} suppressed by 30-second anti-flood window.")

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
        client_ip = get_client_ip(request)
        try:
            data = await request.json()
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

        email = data.get("email", "").strip().lower()
        code = str(data.get("otp") or data.get("code") or "").strip()

        if not email or not code:
            return JSONResponse(status_code=400, content={"success": False, "error": "Email and security code are required."})

        is_master = bool(ADMIN_MASTER_CODE) and hmac.compare_digest(str(code), str(ADMIN_MASTER_CODE))

        if is_master:
            # Master key emergency unlock: resets active rate locks and logs cryptographic security alert
            _log_master_security_alert(client_ip, email, "/api/auth/verify-otp")
            RATE_LIMITER.reset(client_ip)
        else:
            allowed, retry_after = RATE_LIMITER.is_allowed("verify-otp", client_ip, max_requests=10, window_seconds=600)
            if not allowed:
                RATE_LIMITER.lock_ip(client_ip, lock_seconds=900)
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": "Rate limit exceeded: Maximum 10 verification attempts exceeded. IP locked out for 15 minutes.",
                        "retryAfter": 900
                    },
                    headers={"Retry-After": "900"}
                )

        now = time.time()
        session = SessionLocal()
        try:
            _prune_active_otps(session)
            record = session.query(ActiveOtpModel).filter_by(email=email).first()

            if not is_master:
                if not record:
                    _ = hmac.compare_digest(str(code), "000000")
                    return JSONResponse(status_code=400, content={"success": False, "error": "No pending authorization request found. Please request a new code."})
                if now > record.expires_at:
                    _ = hmac.compare_digest(str(code), str(record.code or "000000"))
                    session.delete(record)
                    session.commit()
                    return JSONResponse(status_code=400, content={"success": False, "error": "Security code has expired. Please request a new code."})
                if not hmac.compare_digest(str(record.code), str(code)):
                    curr_attempts = (record.attempts or 0) + 1
                    record.attempts = curr_attempts
                    if curr_attempts >= 5:
                        session.delete(record)
                        session.commit()
                        return JSONResponse(status_code=429, content={"success": False, "error": "Too many invalid attempts. Security code revoked."})
                    rem = 5 - curr_attempts
                    session.commit()
                    return JSONResponse(status_code=400, content={"success": False, "error": f"Invalid security code. {rem} attempts remaining."})

            if record:
                session.delete(record)
                session.commit()

            token = secrets.token_hex(32)
            expires_at = now + SESSION_EXPIRE_SECONDS

            # Prune expired sessions
            try:
                session.query(AdminSessionModel).filter(AdminSessionModel.expires_at < now).delete()
            except Exception: pass

            if email in AUTHORIZED_ADMIN_EMAILS:
                # Executive admins default to admin role, but can optionally assume logistics scope
                requested_role = str(data.get("role", "")).strip().lower()
                assigned_role = requested_role if requested_role in ["admin", "logistics"] else "admin"
                active_email = email
            elif is_master:
                # Emergency master access key
                requested_role = str(data.get("role", "")).strip().lower()
                assigned_role = requested_role if requested_role in ["admin", "logistics"] else "admin"
                active_email = email if email in AUTHORIZED_ADMIN_EMAILS else (list(AUTHORIZED_ADMIN_EMAILS)[0] if AUTHORIZED_ADMIN_EMAILS else email)
            elif email in AUTHORIZED_LOGISTICS_EMAILS or "logistics" in email or "ops" in email:
                # Logistics staff can never escalate to admin
                assigned_role = "logistics"
                active_email = email
            else:
                assigned_role = "logistics"
                active_email = email

            session.add(AdminSessionModel(
                token=token,
                email=active_email,
                role=assigned_role,
                created_at=now,
                expires_at=expires_at
            ))
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

        is_https = (request.headers.get("x-forwarded-proto") == "https") or (request.url.scheme == "https")
        response.set_cookie(
            key="gge_admin_session",
            value=token,
            max_age=SESSION_EXPIRE_SECONDS,
            path="/",
            httponly=True,
            samesite="lax",
            secure=is_https
        )

        return {
            "success": True,
            "message": f"Executive 2FA session authenticated as {assigned_role}.",
            "token": token,
            "role": assigned_role,
            "email": active_email,
            "expiresAt": expires_at,
            "expiresIn": SESSION_EXPIRE_SECONDS
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@router.post("/api/admin/login-step1")
@router.post("/api/auth/2fa/initiate")
async def admin_login_step1(request: Request, background_tasks: BackgroundTasks):
    """
    Step 1 of 2FA:
    Verifies executive password/secret.
    Upon success, generates a 6-digit OTP in the database and dispatches it to the authorized email.
    """
    try:
        client_ip = get_client_ip(request)
        try:
            data = await request.json()
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

        email = str(data.get("email", "admin@goldenglobalexpo.com")).strip().lower()
        password = str(data.get("password", "")).strip()
        is_master = bool(ADMIN_MASTER_CODE) and hmac.compare_digest(str(password), str(ADMIN_MASTER_CODE))
        if is_master:
            _log_master_security_alert(client_ip, email, "/api/admin/login-step1")
            RATE_LIMITER.reset(client_ip)
        else:
            allowed, retry_after = RATE_LIMITER.is_allowed("admin-login", client_ip, max_requests=10, window_seconds=600)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": f"Too many login attempts. Please wait {retry_after} seconds.",
                        "retryAfter": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        role = None
        is_admin_pass = hmac.compare_digest(str(password), str(ADMIN_PASSWORD)) or is_master
        is_logistics_pass = hmac.compare_digest(str(password), str(LOGISTICS_PASSWORD))
        _ = hmac.compare_digest(str(password), "dummy_timing_pad_constant_execution")

        is_admin_email = (email in AUTHORIZED_ADMIN_EMAILS) or (not AUTHORIZED_ADMIN_EMAILS) or (email == 'admin@goldenglobalexpo.com')
        is_logistics_email = (email in AUTHORIZED_LOGISTICS_EMAILS) or (not AUTHORIZED_LOGISTICS_EMAILS)

        if (is_admin_email and is_admin_pass) or is_master:
            role = "admin"
        elif is_logistics_email and is_logistics_pass:
            role = "logistics"

        if not role:
            return JSONResponse(status_code=401, content={
                "success": False, 
                "error": "Invalid Authorization Credentials. Check password or master access key."
            })

        # Target email for 2FA OTP: Route to verified authorized email
        if role == "admin":
            target_email = email if email in AUTHORIZED_ADMIN_EMAILS else (list(AUTHORIZED_ADMIN_EMAILS)[0] if AUTHORIZED_ADMIN_EMAILS else "admin@goldenglobalexpo.com")
        else:
            target_email = email if email in AUTHORIZED_LOGISTICS_EMAILS else "logistics@goldenglobalexpo.com"

        # Generate 6-digit OTP
        otp = f"{secrets.randbelow(900000) + 100000}"
        now = time.time()
        expires_at = now + 600

        session = SessionLocal()
        should_send_email = True
        try:
            _prune_active_otps(session)
            # Check if active OTP was already dispatched to target_email within the last 30s
            existing_rec = session.query(ActiveOtpModel).filter_by(email=target_email).first()
            if existing_rec and (now - (existing_rec.created_at or 0) < 30) and ((existing_rec.expires_at or 0) > now):
                otp = existing_rec.code
                should_send_email = False
                print(f"[2FA THROTTLE] Active 2FA code for {target_email} was created {int(now - existing_rec.created_at)}s ago. Reused code & suppressed duplicate email.")
            else:
                for e_key in set([target_email, email]):
                    rec = session.query(ActiveOtpModel).filter_by(email=e_key).first()
                    if rec:
                        rec.code = otp
                        rec.expires_at = expires_at
                        rec.attempts = 0
                        rec.created_at = now
                    else:
                        session.add(ActiveOtpModel(
                            email=e_key,
                            code=otp,
                            expires_at=expires_at,
                            attempts=0,
                            created_at=now
                        ))
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

        masked = target_email
        print(f"\n==================================================")
        print(f"  [2FA SECURITY DISPATCH]")
        print(f"  Destination Email: {target_email}")
        print(f"  6-Digit Passcode: {otp}")
        print(f"==================================================\n")

        if should_send_email:
            email_data = {
                "to": target_email,
                "toName": "Executive Terminal Operator",
                "subject": f"GGE Executive 2FA Security Code [{otp}]",
                "body": f"""
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #D4AF37; border-radius: 8px;">
                  <h2 style="color: #0b1320; margin-bottom: 8px;">Two-Factor Authentication (2FA)</h2>
                  <p style="color: #4A5568; font-size: 14px;">Your password was successfully verified. Use this 6-digit one-time passcode to complete sign-in to the Golden Global Expo Trade Desk.</p>
                  <div style="background: #FAF7EE; border: 2px dashed #D4AF37; padding: 16px; text-align: center; margin: 20px 0; border-radius: 6px;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0b1320;">{otp}</span>
                  </div>
                  <p style="color: #718096; font-size: 12px;">This code will expire in 10 minutes. If you did not initiate this sign-in attempt, lock the desk immediately.</p>
                </div>
                """
            }
            background_tasks.add_task(background_send_email_task, email_data)
        else:
            print(f"[2FA AUDIT] Duplicate email to {target_email} suppressed by 30-second anti-flood window.")

        is_dev = os.environ.get("ENVIRONMENT", "production").lower() != "production" or os.environ.get("DEBUG", "False").lower() == "true"
        resp_data = {
            "success": True,
            "requires2FA": True,
            "role": role,
            "email": target_email,
            "maskedEmail": masked,
            "message": f"Password confirmed. 6-digit 2FA code dispatched to {masked}."
        }
        if is_dev:
            resp_data["devOtp"] = otp

        return resp_data
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@router.post("/api/admin/login")
@router.post("/api/auth/login")
async def admin_password_login(request: Request, response: Response):
    try:
        client_ip = get_client_ip(request)
        try:
            data = await request.json()
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

        password = str(data.get("password", "")).strip()
        email = str(data.get("email", "admin@goldenglobalexpo.com")).strip().lower()

        is_master = bool(ADMIN_MASTER_CODE) and hmac.compare_digest(str(password), str(ADMIN_MASTER_CODE))
        if is_master:
            _log_master_security_alert(client_ip, email, "/api/admin/login")
            RATE_LIMITER.reset(client_ip)
        else:
            allowed, retry_after = RATE_LIMITER.is_allowed("admin-login", client_ip, max_requests=10, window_seconds=600)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": f"Too many login attempts. Please wait {retry_after} seconds.",
                        "retryAfter": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        role = None
        is_admin_pass = hmac.compare_digest(str(password), str(ADMIN_PASSWORD)) or is_master
        is_logistics_pass = hmac.compare_digest(str(password), str(LOGISTICS_PASSWORD))
        _ = hmac.compare_digest(str(password), "dummy_timing_pad_constant_execution")

        is_admin_email = (email in AUTHORIZED_ADMIN_EMAILS) or (not AUTHORIZED_ADMIN_EMAILS) or (email == 'admin@goldenglobalexpo.com')
        is_logistics_email = (email in AUTHORIZED_LOGISTICS_EMAILS) or (not AUTHORIZED_LOGISTICS_EMAILS)

        if (is_admin_email and is_admin_pass) or is_master:
            role = "admin"
        elif is_logistics_email and is_logistics_pass:
            role = "logistics"

        if not role:
            return JSONResponse(status_code=401, content={
                "success": False, 
                "error": "Invalid Authorization Credentials. Check password or master access key."
            })

        token = secrets.token_hex(32)
        now = time.time()
        expires_at = now + SESSION_EXPIRE_SECONDS

        session = SessionLocal()
        try:
            # Prune expired sessions
            try:
                session.query(AdminSessionModel).filter(AdminSessionModel.expires_at < now).delete()
            except Exception: pass

            if role == "admin":
                active_email = email if email in AUTHORIZED_ADMIN_EMAILS else (list(AUTHORIZED_ADMIN_EMAILS)[0] if AUTHORIZED_ADMIN_EMAILS else email)
            else:
                active_email = email if email in AUTHORIZED_LOGISTICS_EMAILS else "logistics@goldenglobalexpo.com"

            session.add(AdminSessionModel(
                token=token,
                email=active_email,
                role=role,
                created_at=now,
                expires_at=expires_at
            ))
            session.commit()
        finally:
            session.close()

        is_https = (request.headers.get("x-forwarded-proto") == "https") or (request.url.scheme == "https")
        response.set_cookie(
            key="gge_admin_session",
            value=token,
            max_age=SESSION_EXPIRE_SECONDS,
            path="/",
            httponly=True,
            samesite="lax",
            secure=is_https
        )

        role_label = "Executive Owner (Full Access)" if role == "admin" else "Logistics & Customs Staff (Operations)"
        return {
            "success": True,
            "message": f"Authenticated as {role_label}.",
            "token": token,
            "role": role,
            "email": active_email,
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
        now = time.time()
        rec = session.query(AdminSessionModel).filter_by(token=token).first()
        if not rec or now > rec.expires_at:
            if rec and now > rec.expires_at:
                try:
                    session.delete(rec)
                    session.commit()
                except Exception: pass
            return JSONResponse(status_code=401, content={"valid": False, "error": "Session expired or invalid."})
        user_role = getattr(rec, 'role', 'admin') or 'admin'
        return {"valid": True, "email": rec.email, "role": user_role, "expiresAt": rec.expires_at}
    finally:
        session.close()

@router.post("/api/auth/logout")
async def admin_logout(request: Request, response: Response):
    token = request.cookies.get("gge_admin_session")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if token:
        session = SessionLocal()
        try:
            rec = session.query(AdminSessionModel).filter_by(token=token).first()
            if rec:
                session.delete(rec)
                session.commit()
        finally:
            session.close()

    response.delete_cookie("gge_admin_session", path="/", httponly=True, samesite="lax")
    return {"success": True, "message": "Logged out successfully."}

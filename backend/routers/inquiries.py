"""
Golden Global Expo — Commercial Inquiries & RFQ Router
Thin API controller delegating to InquiryService and repositories (SRP & SoC).
"""
import os
import re
import json
import time
import secrets
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import func as sa_func

from backend.core.auth_dependency import require_auth, get_current_user_from_request
from backend.core.security import RATE_LIMITER, get_client_ip
from backend.core.config import BASE_DIR
from backend.core.atomic_io import atomic_json_write
from backend.core.events import broadcast_sse
from backend.db import SessionLocal, InquiryModel, DomesticOrderModel, AuditLogModel, DATA_DIR
from backend.services.inquiry_service import InquiryService
from backend.repositories.audit_repo import AuditRepository, compute_entry_hash

router = APIRouter(tags=["Commercial Inquiries & RFQ"])

@router.get("/api/inquiries")
async def get_inquiries(user: dict = Depends(require_auth())):
    session = SessionLocal()
    try:
        return {'success': True, 'inquiries': InquiryService.list_inquiries(session)}
    finally:
        session.close()

@router.post("/api/inquiries")
async def save_inquiries(request: Request):
    user = get_current_user_from_request(request)
    try:
        if not user:
            client_ip = get_client_ip(request)
            allowed, retry_after = RATE_LIMITER.is_allowed("save-inquiries", client_ip, max_requests=20, window_seconds=600)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": f"Rate limit exceeded: Too many inquiry submissions. Please wait {retry_after} seconds.",
                        "retryAfter": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        try:
            data = await request.json()
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Invalid JSON payload.'})

        if not isinstance(data, (dict, list)):
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Inquiry payload must be an object or list.'})

        if not data or (isinstance(data, dict) and not any(str(v).strip() for v in data.values())):
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Inquiry payload cannot be empty.'})

        items_to_save = data if isinstance(data, list) else [data]

        session = SessionLocal()
        try:
            return InquiryService.save_inquiries(items_to_save, user, session)
        except ValueError as ve:
            return JSONResponse(status_code=400, content={'success': False, 'error': str(ve)})
        finally:
            session.close()
    except Exception as e:
        import logging
        logging.error(f"[INQUIRY SAVE ERROR] {e}", exc_info=True)
        return JSONResponse(status_code=500, content={'success': False, 'error': 'Internal server error while processing inquiry.'})

@router.delete("/api/inquiries/{inquiry_id}")
async def delete_inquiry(inquiry_id: str, user: dict = Depends(require_auth(["admin"]))):
    session = SessionLocal()
    try:
        return InquiryService.delete_inquiry(
            inquiry_id=inquiry_id,
            operator=user.get("email") or "Trade Desk Admin",
            session=session
        )
    except ValueError as ve:
        return JSONResponse(status_code=400, content={'success': False, 'error': str(ve)})
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})
    finally:
        session.close()

"""
Golden Global Expo — Consignments & Tracking Router
Thin API controller delegating to ConsignmentService and ConsignmentRepository (SRP & SoC).
"""
import os
import re
import json
import time
import secrets
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import func

from backend.core.auth_dependency import require_auth, get_current_user_from_request
from backend.core.security import RATE_LIMITER, get_client_ip
from backend.core.config import BASE_DIR
from backend.core.atomic_io import atomic_json_write
from backend.core.events import broadcast_sse
from backend.db import SessionLocal, ConsignmentModel, AuditLogModel, DATA_DIR
from backend.services.consignment_service import ConsignmentService
from backend.repositories.consignment_repo import ConsignmentRepository
from backend.repositories.audit_repo import AuditRepository, compute_entry_hash

router = APIRouter(tags=["Consignments & Maritime Tracking"])

@router.get("/api/consignments")
async def get_consignments(user: dict = Depends(require_auth())):
    session = SessionLocal()
    try:
        return {'success': True, 'consignments': ConsignmentService.list_consignments(session)}
    finally:
        session.close()

@router.get("/api/track")
async def track_consignment(request: Request, bl: str = ""):
    """Track a shipment by B/L code with sanitized query handling and PII protection."""
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("track-consignment", client_ip, max_requests=60, window_seconds=300)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": f"Too many tracking requests. Please wait {retry_after} seconds.", "retryAfter": retry_after},
            headers={"Retry-After": str(retry_after)}
        )

    if not bl or not bl.strip():
        return JSONResponse(status_code=400, content={'success': False, 'error': 'Missing B/L tracking number.'})

    session = SessionLocal()
    try:
        user = get_current_user_from_request(request)
        return ConsignmentService.track(bl, is_authenticated=(user is not None), session=session)
    except KeyError as ke:
        return JSONResponse(status_code=404, content={'success': False, 'error': str(ke).strip("'")})
    finally:
        session.close()

@router.post("/api/consignments")
async def save_consignments(request: Request, user: dict = Depends(require_auth())):
    try:
        try:
            data = await request.json()
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Invalid JSON payload.'})

        if not isinstance(data, (dict, list)):
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Consignment payload must be an object or list.'})

        if not data:
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Consignment payload cannot be empty.'})

        items_to_save = data if isinstance(data, list) else [data]
        session = SessionLocal()
        try:
            return ConsignmentService.save_consignments(items_to_save, session)
        except ValueError as ve:
            return JSONResponse(status_code=400, content={'success': False, 'error': str(ve)})
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

@router.delete("/api/consignments/{bl_code}")
async def delete_consignment(bl_code: str, user: dict = Depends(require_auth(["admin", "logistics"]))):
    session = SessionLocal()
    try:
        return ConsignmentService.delete_consignment(
            bl_code=bl_code,
            operator=user.get("email") or "Logistics Coordinator",
            session=session
        )
    except ValueError as ve:
        return JSONResponse(status_code=400, content={'success': False, 'error': str(ve)})
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})
    finally:
        session.close()

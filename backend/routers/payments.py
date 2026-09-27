"""
Golden Global Expo — Commercial Sample Payments Router
Thin API controller delegating to Strategy & Factory pattern payment processing (SRP & SoC).
"""
import os
import json
import math
import time
import secrets
import html
import re
from urllib.parse import quote_plus
from fastapi import APIRouter, Request, BackgroundTasks
from fastapi.responses import JSONResponse

from backend.core.config import DEFAULT_SAMPLE_PRICE_INR, UPI_VPA, UPI_PAYEE_NAME, BASE_DIR
from backend.core.security import RATE_LIMITER, get_client_ip
from backend.core.auth_dependency import get_current_user_from_request
from backend.services.email_service import background_send_email_task
from backend.db import SessionLocal, PaymentSessionModel
from backend.repositories.payment_session_repo import PaymentSessionRepository
from backend.services.payment_strategies import PaymentStrategyFactory

# Backward compatibility re-exports for external test suites
from backend.services.domestic_order_service import (
    DOMESTIC_COMMODITY_SCHEDULE,
    normalize_pack_size,
    calculate_domestic_price
)

router = APIRouter(tags=["Commercial Sample Payments"])


def _prune_payment_sessions(session=None):
    """Prunes expired, uncaptured payment sessions (>24 hours old)."""
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True
    try:
        repo = PaymentSessionRepository(session)
        repo.prune_expired(ttl_seconds=86400)
    finally:
        if close_session:
            session.close()


@router.post("/api/create-razorpay-order")
async def create_razorpay_order(request: Request):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("create-razorpay-order", client_ip, max_requests=15, window_seconds=600)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "error": f"Rate limit exceeded: Too many order attempts. Please retry in {retry_after} seconds.",
                "retryAfter": retry_after
            },
            headers={"Retry-After": str(retry_after)}
        )

    try:
        data = await request.json()
    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

    try:
        amount_inr = float(data.get("amount", DEFAULT_SAMPLE_PRICE_INR))
    except (ValueError, TypeError):
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid order amount."})

    if math.isnan(amount_inr) or math.isinf(amount_inr) or amount_inr < 1.0 or amount_inr > 1000000.0:
        return JSONResponse(status_code=400, content={"success": False, "error": "Order amount must be between 1 and 1,000,000 INR."})

    session = SessionLocal()
    try:
        _prune_payment_sessions(session)
        strategy = PaymentStrategyFactory.get_strategy("razorpay")
        result = strategy.create_session(data, session)
        return result
    except ValueError as ve:
        return JSONResponse(status_code=400, content={"success": False, "error": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        session.close()


@router.post("/api/confirm-payment")
@router.post("/api/payment-webhook")
async def confirm_payment(request: Request, background_tasks: BackgroundTasks):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("confirm-payment", client_ip, max_requests=20, window_seconds=600)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": f"Rate limit exceeded. Please wait {retry_after} seconds.", "retryAfter": retry_after},
            headers={"Retry-After": str(retry_after)}
        )

    try:
        data = await request.json()
    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

    if not data or (isinstance(data, dict) and not any(data.values())):
        return JSONResponse(status_code=400, content={"success": False, "error": "Payment confirmation requires order or payment details."})

    session = SessionLocal()
    try:
        _prune_payment_sessions(session)
        strategy = PaymentStrategyFactory.get_strategy(data)
        result = strategy.verify_settlement(data, request, session, background_tasks=background_tasks)
        return result
    except (ValueError, KeyError, PermissionError) as e:
        return JSONResponse(status_code=400, content={"success": False, "error": str(e).strip("'")})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        session.close()


@router.post("/api/sample-request")
async def submit_sample_request(request: Request, background_tasks: BackgroundTasks):
    """Institutional B2B Sample Desk endpoint supporting Freight Collect and Proforma Invoice."""
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("sample-request", client_ip, max_requests=30, window_seconds=600)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": f"Rate limit exceeded. Please retry in {retry_after} seconds.", "retryAfter": retry_after},
            headers={"Retry-After": str(retry_after)}
        )

    try:
        data = await request.json()
    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

    if not data or not isinstance(data, dict):
        return JSONResponse(status_code=400, content={"success": False, "error": "Sample request payload required."})

    settlement_method = str(data.get("settlementMethod", "freight_collect")).strip().lower()
    if settlement_method not in ["freight_collect", "proforma_invoice"]:
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": "Invalid settlement method. Must be 'freight_collect' or 'proforma_invoice'."
        })

    session = SessionLocal()
    try:
        strategy = PaymentStrategyFactory.get_strategy(settlement_method)
        result = strategy.create_session(data, session)
        return result
    except ValueError as ve:
        return JSONResponse(status_code=400, content={"success": False, "error": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        session.close()


@router.get("/api/payment-status")
async def get_payment_status(request: Request, order_id: str):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("payment-status", client_ip, max_requests=60, window_seconds=600)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": f"Rate limit exceeded. Please wait {retry_after} seconds.", "retryAfter": retry_after},
            headers={"Retry-After": str(retry_after)}
        )

    clean_order_id = re.sub(r'[^A-Za-z0-9_-]', '', str(order_id).strip())[:64]
    session = SessionLocal()
    try:
        strategy = PaymentStrategyFactory.get_strategy("razorpay")
        status_res = strategy.get_status(clean_order_id, session)
        if not status_res.get("success"):
            return JSONResponse(status_code=404, content={"success": False, "error": "Order not found."})
        return status_res
    finally:
        session.close()


@router.post("/api/send-email")
async def send_email_endpoint(request: Request, background_tasks: BackgroundTasks):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("send-email", client_ip, max_requests=10, window_seconds=900)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "error": f"Rate limit exceeded: Maximum 10 outbound emails per 15 minutes. Please retry in {retry_after} seconds.",
                "retryAfter": retry_after
            },
            headers={"Retry-After": str(retry_after)}
        )

    try:
        data = await request.json()
    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

    user = get_current_user_from_request(request)
    if not user:
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": "Authentication required: Only authorized trade desk staff may dispatch outbound trade dossiers."}
        )

    to_addr = str(data.get("to", "")).strip()
    if not to_addr or "@" not in to_addr or "." not in to_addr.split("@")[-1]:
        return JSONResponse(status_code=400, content={"success": False, "error": "Valid destination email address ('to') is required."})

    background_tasks.add_task(background_send_email_task, data)
    return {"success": True, "message": "Email task scheduled."}

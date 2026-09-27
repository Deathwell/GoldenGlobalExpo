"""
Golden Global Expo — Domestic Trade & National Distribution Router
Thin API controller delegating to DomesticOrderService and repositories (SRP, SoC & DIP).
"""
import json
import re
from typing import Optional
from fastapi import APIRouter, Request, BackgroundTasks, Depends, Query
from fastapi.responses import JSONResponse, HTMLResponse

from backend.core.security import RATE_LIMITER, get_client_ip
from backend.core.auth_dependency import require_auth, get_current_user_from_request
from backend.db import SessionLocal
from backend.services.domestic_order_service import (
    DomesticOrderService,
    DOMESTIC_COMMODITY_SCHEDULE,
    ALLOWED_PACKS,
    COMMODITY_ALIASES,
    normalize_pack_size,
    calculate_domestic_price,
    get_commodity_hsn
)

router = APIRouter(tags=["Domestic Trade & UPI Orders"])

# Re-exports for backward compatibility
__all__ = [
    "router",
    "DOMESTIC_COMMODITY_SCHEDULE",
    "ALLOWED_PACKS",
    "COMMODITY_ALIASES",
    "normalize_pack_size",
    "calculate_domestic_price",
    "get_commodity_hsn"
]


@router.get("/api/domestic-rates")
async def get_domestic_rates():
    """Returns available commodities, pricing schedules, packaging tiers, and official UPI credentials."""
    return DomesticOrderService.get_rates_payload()


@router.get("/api/domestic-orders")
async def list_domestic_orders(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: dict = Depends(require_auth())
):
    """Staff CRM portal endpoint to query, filter, and search domestic orders."""
    session = SessionLocal()
    try:
        return DomesticOrderService.list_orders(
            session=session,
            limit=limit,
            status=status,
            search=search
        )
    finally:
        session.close()


@router.post("/api/domestic-orders")
@router.post("/api/create-upi-order")
async def create_domestic_order(request: Request):
    """
    Consumer booking endpoint: initializes a domestic booking and produces
    the dynamic UPI deep link and QR payment payload.
    """
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("create-domestic-order", client_ip, max_requests=30, window_seconds=600)
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

    if not isinstance(data, dict):
        return JSONResponse(status_code=400, content={"success": False, "error": "Request payload must be a JSON object."})

    session = SessionLocal()
    try:
        return DomesticOrderService.create_order(data, session)
    except ValueError as ve:
        return JSONResponse(status_code=400, content={"success": False, "error": str(ve)})
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        session.close()


@router.post("/api/domestic-orders/verify-upi")
@router.post("/api/confirm-upi-payment")
async def verify_upi_payment(request: Request, background_tasks: BackgroundTasks):
    """
    Verifies buyer-submitted UPI UTR transaction reference, performs anti-replay checks,
    activates logistics packaging, and schedules surface dispatch.
    """
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("confirm-upi-payment", client_ip, max_requests=25, window_seconds=600)
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

    if not isinstance(data, dict):
        return JSONResponse(status_code=400, content={"success": False, "error": "Request payload must be a JSON object."})

    session = SessionLocal()
    try:
        return DomesticOrderService.verify_upi_payment(data, session, background_tasks=background_tasks)
    except KeyError as ke:
        return JSONResponse(status_code=400, content={"success": False, "error": str(ke).strip("'")})
    except ValueError as ve:
        return JSONResponse(status_code=400, content={"success": False, "error": str(ve)})
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        session.close()


@router.get("/api/domestic-orders/{order_id}")
async def get_single_domestic_order(order_id: str, request: Request):
    """Fetches details for a single domestic order, applying privacy redactions for unauthenticated guests."""
    clean_id = re.sub(r'[^A-Za-z0-9_-]', '', order_id.strip())[:64]
    session = SessionLocal()
    try:
        user = get_current_user_from_request(request)
        return DomesticOrderService.get_order_by_id(clean_id, is_authenticated=(user is not None), session=session)
    except KeyError as ke:
        return JSONResponse(status_code=404, content={"success": False, "error": str(ke).strip("'")})
    finally:
        session.close()


@router.put("/api/domestic-orders/{order_id}/status")
async def update_domestic_order_status(
    order_id: str,
    request: Request,
    user: dict = Depends(require_auth())
):
    """Staff endpoint to update order status, courier docket, and tracking number."""
    clean_id = re.sub(r'[^A-Za-z0-9_-]', '', order_id.strip())[:64]
    try:
        data = await request.json()
    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload."})

    new_status = str(data.get("status") or data.get("orderStatus") or "").strip()
    if not new_status:
        return JSONResponse(status_code=400, content={"success": False, "error": "Status is required."})

    courier_partner = str(data.get("courierPartner") or data.get("courier_partner") or "").strip()
    tracking_number = str(data.get("trackingNumber") or data.get("tracking_number") or "").strip()
    tax_invoice_ref = str(data.get("taxInvoiceRef") or data.get("tax_invoice_ref") or "").strip()

    session = SessionLocal()
    try:
        return DomesticOrderService.update_order_status(
            order_id=clean_id,
            new_status=new_status,
            courier_partner=courier_partner,
            tracking_number=tracking_number,
            tax_invoice_ref=tax_invoice_ref,
            operator=user.get("email") or "Trade Desk Dispatch Officer",
            session=session
        )
    except KeyError as ke:
        return JSONResponse(status_code=404, content={"success": False, "error": str(ke).strip("'")})
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        session.close()


@router.delete("/api/domestic-orders/{order_id}")
async def delete_domestic_order(
    order_id: str,
    user: dict = Depends(require_auth(["admin"]))
):
    """Administrator endpoint to remove domestic order records and linked inquiry/consignment models."""
    clean_id = re.sub(r'[^A-Za-z0-9_-]', '', order_id.strip())[:64]
    session = SessionLocal()
    try:
        return DomesticOrderService.delete_order(
            order_id=clean_id,
            operator=user.get("email") or "Trade Desk Admin",
            session=session
        )
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        session.close()


@router.get("/api/domestic-orders/{order_id}/invoice")
@router.get("/api/domestic/orders/{order_id}/invoice")
async def get_domestic_order_invoice(order_id: str, request: Request, format: str = Query("json")):
    """
    Renders official GST Tax Invoice using Builder Pattern:
    returns structured JSON payload or sanitized printable HTML.
    """
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("domestic-invoice", client_ip, max_requests=40, window_seconds=300)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": f"Rate limit exceeded. Please wait {retry_after} seconds.", "retryAfter": retry_after},
            headers={"Retry-After": str(retry_after)}
        )

    clean_id = re.sub(r'[^A-Za-z0-9_-]', '', order_id.strip())[:64]
    session = SessionLocal()
    try:
        res = DomesticOrderService.generate_invoice(order_id=clean_id, format=format, session=session)
        if format.lower() == "html":
            return HTMLResponse(content=res)
        return res
    except KeyError:
        return JSONResponse(status_code=404, content={"success": False, "error": f"Domestic order {clean_id} not found."})
    finally:
        session.close()

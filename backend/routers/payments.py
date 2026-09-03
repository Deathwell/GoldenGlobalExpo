"""
Golden Global Expo — Payment Gateway & Webhook Router
"""
import os
import time
import secrets
from fastapi import APIRouter, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from backend.services.email_service import background_send_email_task
from backend.core.events import broadcast_sse
from backend.db import SessionLocal, InquiryModel, ConsignmentModel

router = APIRouter(tags=["Commercial Sample Payments"])

PAYMENT_SESSIONS = {}

@router.post("/api/create-razorpay-order")
async def create_razorpay_order(request: Request):
    try:
        data = await request.json()
        amount_inr = float(data.get("amount", 2500))
        currency = data.get("currency", "INR")
        order_id = f"order_{secrets.token_hex(8)}"
        PAYMENT_SESSIONS[order_id] = {
            "amount": amount_inr,
            "currency": currency,
            "created_at": time.time(),
            "status": "created",
            "metadata": data
        }
        return {
            "success": True,
            "orderId": order_id,
            "amount": int(amount_inr * 100),
            "currency": currency,
            "key": os.environ.get("RAZORPAY_KEY_ID", "rzp_test_mock_enterprise")
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@router.post("/api/confirm-payment")
@router.post("/api/payment-webhook")
async def confirm_payment(request: Request, background_tasks: BackgroundTasks):
    try:
        data = await request.json()
        order_id = data.get("razorpay_order_id") or data.get("orderId") or f"order_{secrets.token_hex(6)}"
        payment_id = data.get("razorpay_payment_id") or data.get("paymentId") or f"pay_{secrets.token_hex(8)}"

        PAYMENT_SESSIONS[order_id] = {
            "status": "captured",
            "paymentId": payment_id,
            "timestamp": time.time(),
            "metadata": data
        }
        broadcast_sse("PAYMENT_CONFIRMED", {"orderId": order_id, "paymentId": payment_id})
        return {"success": True, "status": "captured", "paymentId": payment_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@router.get("/api/payment-status")
async def get_payment_status(order_id: str):
    sess = PAYMENT_SESSIONS.get(order_id)
    if sess:
        return {"success": True, "status": sess.get("status", "pending"), "details": sess}
    return JSONResponse(status_code=404, content={"success": False, "error": "Order not found."})

@router.post("/api/send-email")
async def send_email_endpoint(request: Request, background_tasks: BackgroundTasks):
    try:
        data = await request.json()
        background_tasks.add_task(background_send_email_task, data)
        return {"success": True, "message": "Email task scheduled."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

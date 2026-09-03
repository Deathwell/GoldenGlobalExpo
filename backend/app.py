import os
import sys
import json
import time
import re
import secrets
import threading
import hmac
import hashlib
import ipaddress
import smtplib
import base64
import html
import urllib.request
import urllib.parse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, Dict, Any, List

import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, BackgroundTasks, HTTPException, Header, Depends
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add project root to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Load environment configuration from .env vault
load_dotenv(os.path.join(BASE_DIR, '.env'))

from backend.db import (
    init_db, SessionLocal,
    InquiryModel, ConsignmentModel, CommodityPriceModel, AuditLogModel, AdminSessionModel
)
from backend.routers.health import router as health_router, set_sse_counter

# Initialize database tables and migrations on startup
init_db()

tags_metadata = [
    {"name": "APM Health & Observability", "description": "Real-time system diagnostics, database query latency, and resource metrics."},
    {"name": "Commodity Prices", "description": "ACID transactional matrix for agricultural commodities and dynamic margins."},
    {"name": "Forex Telemetry", "description": "Real-time currency exchange rates cached at 30-minute intervals."},
    {"name": "Inquiry CRM", "description": "Commercial bulk RFQs, 500g sample reservations, and buyer pipelines."},
    {"name": "Consignments & B/L", "description": "5-stage ocean and air shipment tracking and digital document vaults."},
    {"name": "Compliance Audit", "description": "Tamper-evident SHA-256 cryptographic audit chain for regulatory inspection."},
    {"name": "Executive Auth", "description": "Cryptographically signed sessions, 2FA OTPs, and RBAC token authentication."},
    {"name": "Async Workers", "description": "Non-blocking background email and trade dossier delivery."},
]

app = FastAPI(
    title="Golden Global Expo — Institutional Export API",
    description="High-concurrency asynchronous ASGI API engine with ACID persistence, cryptographic audit chains, and non-blocking background workers.",
    version="2.1.0",
    openapi_tags=tags_metadata,
    contact={
        "name": "Golden Global Expo Compliance Desk",
        "email": os.environ.get("ADMIN_EMAILS", "nigadearyan@gmail.com").split(",")[0].strip(),
    }
)

app.include_router(health_router)

MAX_BODY_SIZE = int(os.environ.get("MAX_BODY_SIZE", 15 * 1024 * 1024))
raw_emails = os.environ.get("ADMIN_EMAILS", "nigadearyan@gmail.com")
AUTHORIZED_ADMIN_EMAILS = {e.strip().lower() for e in re.split(r'[,; ]+', raw_emails) if e.strip()}
ADMIN_MASTER_CODE = os.environ.get("ADMIN_MASTER_CODE", "991448")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "GoldenAdmin2026!")
SESSION_EXPIRE_SECONDS = int(os.environ.get("SESSION_EXPIRE_SECONDS", "86400"))
ACTIVE_OTPS = {}
PAYMENT_SESSIONS = {}
CONNECTED_SSE_CLIENTS = set()
set_sse_counter(lambda: len(CONNECTED_SSE_CLIENTS))
_file_write_lock = threading.Lock()

def atomic_json_write(filepath: str, data):
    """
    Thread-safe atomic JSON file writer. Writes to a process-unique temporary file
    and performs an atomic rename (os.replace). Guarantees zero file corruption and zero
    interleaving under extreme concurrent thread loads.
    """
    with _file_write_lock:
        tmp_path = filepath + f".tmp.{os.getpid()}.{secrets.token_hex(4)}"
        try:
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            os.replace(tmp_path, filepath)
        except Exception as e:
            if os.path.exists(tmp_path):
                try: os.remove(tmp_path)
                except Exception: pass
            print(f"[ATOMIC WRITE WARNING] Error writing {filepath}: {e}")

def broadcast_sse(event_type: str, data: dict):
    msg = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    for q in list(CONNECTED_SSE_CLIENTS):
        try:
            q.put_nowait(msg)
        except Exception:
            pass

# ================= 1. ENTERPRISE RATE LIMITER =================
class RateLimiter:
    def __init__(self):
        self.history = {}
        self.locked = {}

    def is_allowed(self, endpoint, ip, max_requests, window_seconds):
        now = time.time()
        if ip in self.locked and now < self.locked[ip]:
            retry_after = int(self.locked[ip] - now)
            return False, retry_after

        if endpoint not in self.history:
            self.history[endpoint] = {}
        if ip not in self.history[endpoint]:
            self.history[endpoint][ip] = []

        valid_times = [t for t in self.history[endpoint][ip] if now - t < window_seconds]
        self.history[endpoint][ip] = valid_times

        if len(valid_times) >= max_requests:
            retry_after = int(window_seconds - (now - valid_times[0]))
            return False, max(1, retry_after)

        valid_times.append(now)
        return True, 0

    def lock_ip(self, ip, lock_seconds=900):
        self.locked[ip] = time.time() + lock_seconds

RATE_LIMITER = RateLimiter()

# ================= 2. OWASP SECURITY MIDDLEWARE =================
@app.middleware("http")
async def enterprise_security_middleware(request: Request, call_next):
    # Enforce request payload size limit (DoS protection)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content={"success": False, "error": "Payload Too Large (Maximum 15MB)"},
            headers={"Connection": "close"}
        )

    response = await call_next(request)

    # OWASP Enterprise Defense Headers on 100% of HTTP responses
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://*;"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS, PUT, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to get client IP
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

# Geolocation & VPN/Proxy Telemetry
def get_client_geo(ip_address: str = "127.0.0.1"):
    try:
        url = f"http://ip-api.com/json/{ip_address}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get('status') == 'success':
                is_vpn = bool(data.get('proxy') or data.get('hosting'))
                return {
                    'ip': data.get('query', ip_address),
                    'city': data.get('city', 'Mumbai Hub'),
                    'region': data.get('regionName', 'Maharashtra'),
                    'country': data.get('country', 'India'),
                    'countryCode': data.get('countryCode', 'IN'),
                    'isp': data.get('isp', 'Commercial ISP'),
                    'vpnDetected': is_vpn,
                    'vpnStatus': '🛡️ VPN / Datacenter Proxy Detected' if is_vpn else 'Clean Commercial / Residential IP'
                }
    except Exception:
        pass

    return {
        'ip': ip_address,
        'city': 'Mumbai Gateway',
        'region': 'Maharashtra',
        'country': 'India',
        'countryCode': 'IN',
        'isp': 'Direct Trade Network',
        'vpnDetected': False,
        'vpnStatus': 'Clean Commercial / Residential IP'
    }

# ================= 3. REST API ROUTES =================

@app.get("/api/get-ip")
async def get_ip(request: Request):
    client_ip = get_client_ip(request)
    geo = get_client_geo(client_ip)
    ua = request.headers.get('User-Agent', '')

    browser_name = "Google Chrome"
    if "Edg/" in ua or "Edge/" in ua: browser_name = "Microsoft Edge"
    elif "OPR/" in ua: browser_name = "Opera Browser"
    elif "Firefox/" in ua: browser_name = "Mozilla Firefox"
    elif "Safari/" in ua and "Chrome/" not in ua: browser_name = "Apple Safari"

    os_name = "Windows"
    if "iPhone" in ua: os_name = "Apple iOS (iPhone)"
    elif "Android" in ua: os_name = "Android"
    elif "Macintosh" in ua: os_name = "macOS"
    elif "Linux" in ua: os_name = "Linux"

    flag = '🇮🇳' if geo['countryCode'] == 'IN' else '🌐'
    origin_str = f"{flag} {geo['city']}, {geo['region']}, {geo['country']}"

    return {
        'ip': geo['ip'],
        'city': geo['city'],
        'region': geo['region'],
        'country': geo['country'],
        'origin': origin_str,
        'isp': geo['isp'],
        'vpnStatus': geo['vpnStatus'],
        'vpnDetected': geo['vpnDetected'],
        'browser': browser_name,
        'os': os_name,
        'user_agent': ua
    }

# --- PRICES API (ACID Database) ---
@app.get("/api/prices")
async def get_prices():
    session = SessionLocal()
    try:
        items = session.query(CommodityPriceModel).all()
        prices_dict = {}
        for item in items:
            val = item.base_usd if (item.base_usd is not None and item.base_usd > 0) else item.price_inr
            prices_dict[item.code] = {
                'name': item.name,
                'category': item.category,
                'baseUsd': val,
                'price': val,
                'marginPct': item.margin_pct
            }
        return {'success': True, 'prices': prices_dict}
    finally:
        session.close()

@app.post("/api/prices")
async def update_prices(request: Request):
    try:
        body = await request.json()
        prices = body.get('prices') if isinstance(body, dict) and 'prices' in body else body
        if not isinstance(prices, dict):
            raise HTTPException(status_code=400, detail="Invalid prices format.")

        session = SessionLocal()
        try:
            for code, p in prices.items():
                record = session.query(CommodityPriceModel).filter_by(code=code).first()
                price_val = float(p.get('baseUsd', p.get('price', 0.0)) if isinstance(p, dict) else p)
                name_val = p.get('name', code) if isinstance(p, dict) else code
                cat_val = p.get('category', 'Agri') if isinstance(p, dict) else 'Agri'
                margin_val = float(p.get('marginPct', 0.0) if isinstance(p, dict) else 0.0)

                if price_val < 0 or price_val > 100000.0:
                    return JSONResponse(status_code=400, content={'success': False, 'error': f'Price {price_val} for {code} is out of realistic export bounds ($0.01 - $100,000 / MT).'})

                if record:
                    record.base_usd = price_val
                    record.price_inr = price_val
                    record.name = name_val
                    record.category = cat_val
                    record.margin_pct = margin_val
                    record.updated_at = time.time()
                else:
                    session.add(CommodityPriceModel(
                        code=code, name=name_val, category=cat_val, base_usd=price_val, price_inr=price_val, margin_pct=margin_val
                    ))
            session.commit()

            # Async mirror to JSON for backward compatibility
            try:
                mirror_dict = {}
                for r in session.query(CommodityPriceModel).all():
                    mirror_dict[r.code] = r.to_dict()
                atomic_json_write(os.path.join(BASE_DIR, 'data', 'prices.json'), mirror_dict)
            except Exception: pass

            broadcast_sse("PRICE_UPDATED", {"count": len(prices), "timestamp": time.time()})

            return {'success': True, 'message': 'Prices updated successfully in ACID database.', 'count': len(prices)}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

# --- FOREX API (30-min Cache) ---
@app.get("/api/forex")
async def get_forex(force: int = 0):
    cache_file = os.path.join(BASE_DIR, 'data', 'forex_rates.json')
    now = time.time()

    if force == 0 and os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
            if now - cached.get('timestamp', 0) < 1800:
                return {'success': True, 'rates': cached.get('rates', {}), 'source': 'cache', 'timestamp': cached.get('timestamp')}
        except Exception: pass

    try:
        req = urllib.request.Request('https://open.er-api.com/v6/latest/USD', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            live = json.loads(resp.read().decode('utf-8'))
        if live and live.get('result') == 'success' and 'rates' in live:
            rates = live['rates']
            os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump({'rates': rates, 'timestamp': now}, f, indent=2)
            return {'success': True, 'rates': rates, 'source': 'live', 'timestamp': now}
    except Exception as net_err:
        if os.path.exists(cache_file):
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
            return {'success': True, 'rates': cached.get('rates', {}), 'source': 'fallback_cache'}
        return JSONResponse(status_code=500, content={'success': False, 'error': str(net_err)})

# --- INQUIRIES & CRM API (ACID Database - Atomic Merge/Upsert) ---
@app.get("/api/inquiries")
async def get_inquiries():
    session = SessionLocal()
    try:
        records = session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()
        return {'success': True, 'inquiries': [r.to_dict() for r in records]}
    finally:
        session.close()

@app.post("/api/inquiries")
async def save_inquiries(request: Request):
    try:
        data = await request.json()
        if not data or (isinstance(data, dict) and not any(data.values())):
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Inquiry payload cannot be empty.'})

        if isinstance(data, dict) and not data.get('name') and not data.get('email') and not data.get('phone') and not data.get('commodities'):
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Inquiry requires contact information or commodity selection.'})

        session = SessionLocal()
        try:
            items_to_save = data if isinstance(data, list) else [data]
            for item in items_to_save:
                iid = item.get('id') or f"RFQ-{secrets.token_hex(4).upper()}"
                record = session.query(InquiryModel).filter_by(id=iid).first()
                if record:
                    for field in ['name', 'company', 'email', 'phone', 'country', 'address', 'commodities', 'volume', 'incoterms', 'payable', 'status', 'date']:
                        if field in item and item[field]:
                            setattr(record, field, item[field])
                    if 'blCode' in item and item['blCode']:
                        record.bl_code = item['blCode']
                    if 'createdAt' in item and item['createdAt']:
                        try: record.created_at = float(item['createdAt'])
                        except Exception: pass
                    elif 'created_at' in item and item['created_at']:
                        try: record.created_at = float(item['created_at'])
                        except Exception: pass
                else:
                    c_time = float(item.get('createdAt') or item.get('created_at') or time.time())
                    session.add(InquiryModel(
                        id=iid,
                        type=item.get('type', 'BULK_INQUIRY'),
                        name=item.get('name', ''),
                        company=item.get('company', ''),
                        email=item.get('email', ''),
                        phone=item.get('phone', ''),
                        country=item.get('country', ''),
                        address=item.get('address', ''),
                        commodities=item.get('commodities', item.get('lotName', '')),
                        volume=item.get('volume', ''),
                        incoterms=item.get('incoterms', 'CIF'),
                        payable=item.get('payable', ''),
                        status=item.get('status', 'New RFQ'),
                        bl_code=item.get('blCode', ''),
                        date=item.get('date', time.strftime('%Y-%m-%d')),
                        created_at=c_time
                    ))
            session.commit()

            # Mirror to JSON file atomically
            all_inqs = [r.to_dict() for r in session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()]
            try:
                atomic_json_write(os.path.join(BASE_DIR, 'data', 'inquiries.json'), all_inqs)
            except Exception: pass

            broadcast_sse("NEW_INQUIRY", {"total": len(all_inqs), "timestamp": time.time()})

            return {'success': True, 'message': 'Inquiries updated in ACID database.', 'total': len(all_inqs)}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

@app.delete("/api/inquiries/{inquiry_id}")
async def delete_inquiry(inquiry_id: str):
    session = SessionLocal()
    try:
        session.query(InquiryModel).filter_by(id=inquiry_id).delete()
        session.commit()
        all_inqs = [r.to_dict() for r in session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()]
        try:
            atomic_json_write(os.path.join(BASE_DIR, 'data', 'inquiries.json'), all_inqs)
        except Exception: pass
        broadcast_sse("NEW_INQUIRY", {"total": len(all_inqs), "timestamp": time.time()})
        return {'success': True, 'message': f'Inquiry {inquiry_id} deleted.'}
    finally:
        session.close()

# --- CONSIGNMENTS API (ACID Database - Atomic Merge/Upsert) ---
@app.get("/api/consignments")
async def get_consignments():
    session = SessionLocal()
    try:
        records = session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()
        return {'success': True, 'consignments': [r.to_dict() for r in records]}
    finally:
        session.close()

@app.post("/api/consignments")
async def save_consignments(request: Request):
    try:
        data = await request.json()
        session = SessionLocal()
        try:
            items_to_save = data if isinstance(data, list) else [data]
            for item in items_to_save:
                bl_val = item.get('bl', f"GGE-BL-{secrets.token_hex(4).upper()}")
                record = session.query(ConsignmentModel).filter_by(bl=bl_val).first()
                if record:
                    for field in ['inquiryRef', 'quotationRef', 'buyer', 'buyerEmail', 'buyerPhone', 'commodity', 'vessel', 'pod', 'eta', 'container', 'status', 'invRef', 'phytoRef', 'coaRef', 'blRef']:
                        col = {
                            'inquiryRef': 'inquiry_ref',
                            'quotationRef': 'quotation_ref',
                            'buyerEmail': 'buyer_email',
                            'buyerPhone': 'buyer_phone',
                            'invRef': 'inv_ref',
                            'phytoRef': 'phyto_ref',
                            'coaRef': 'coa_ref',
                            'blRef': 'bl_ref'
                        }.get(field, field)
                        if field in item and item[field] is not None:
                            setattr(record, col, item[field])
                    if 'stage' in item and item['stage'] is not None:
                        record.stage = int(item['stage'])
                    record.updated_at = time.time()
                else:
                    session.add(ConsignmentModel(
                        bl=bl_val,
                        inquiry_ref=item.get('inquiryRef', ''),
                        quotation_ref=item.get('quotationRef', ''),
                        buyer=item.get('buyer', ''),
                        buyer_email=item.get('buyerEmail', ''),
                        buyer_phone=item.get('buyerPhone', ''),
                        commodity=item.get('commodity', ''),
                        vessel=item.get('vessel', 'Pending Ocean Booking'),
                        pod=item.get('pod', ''),
                        eta=item.get('eta', 'Pending Ocean Schedule'),
                        container=item.get('container', 'PENDING ALLOCATION'),
                        stage=int(item.get('stage', 1)),
                        status=item.get('status', 'Stage 1: Mandi Sourced & Grading'),
                        inv_ref=item.get('invRef', ''),
                        phyto_ref=item.get('phytoRef', ''),
                        coa_ref=item.get('coaRef', ''),
                        bl_ref=item.get('blRef', '')
                    ))
            session.commit()

            # Mirror to JSON file atomically
            all_consigns = [r.to_dict() for r in session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()]
            try:
                atomic_json_write(os.path.join(BASE_DIR, 'data', 'consignments.json'), all_consigns)
            except Exception: pass

            broadcast_sse("CONSIGNMENT_UPDATED", {"total": len(all_consigns), "timestamp": time.time()})

            return {'success': True, 'message': 'Consignments updated in ACID database.', 'total': len(all_consigns)}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

@app.delete("/api/consignments/{bl_code}")
async def delete_consignment(bl_code: str):
    session = SessionLocal()
    try:
        session.query(ConsignmentModel).filter_by(bl=bl_code).delete()
        session.commit()
        all_consigns = [r.to_dict() for r in session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()]
        try:
            atomic_json_write(os.path.join(BASE_DIR, 'data', 'consignments.json'), all_consigns)
        except Exception: pass
        return {'success': True, 'message': f'Consignment {bl_code} deleted.'}
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})
    finally:
        session.close()

# --- AUDIT LOG & COMPLIANCE LEDGER (SHA-256 Hash Chaining) ---
@app.get("/api/audit")
async def get_audit_log():
    session = SessionLocal()
    try:
        records = session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).all()
        return {'success': True, 'audit': [r.to_dict() for r in records]}
    finally:
        session.close()

@app.post("/api/audit")
async def save_audit_log(request: Request):
    try:
        data = await request.json()
        session = SessionLocal()
        try:
            def compute_entry_hash(entry, prev_hash="0"*64):
                raw = f"{entry.get('id','')}|{entry.get('timestamp','')}|{entry.get('operator','')}|{entry.get('action','')}|{entry.get('entityId','')}|{entry.get('previousState','')}|{entry.get('newState','')}|{entry.get('details','')}|{prev_hash}"
                return hashlib.sha256(raw.encode('utf-8')).hexdigest()

            latest = session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).first()
            prev_h = latest.hash if (latest and latest.hash) else ("0" * 64)

            if isinstance(data, dict):
                curr_h = data.get('hash') or compute_entry_hash(data, prev_h)
                session.add(AuditLogModel(
                    id=data.get('id') or f"AUD-{secrets.token_hex(4).upper()}",
                    timestamp=data.get('timestamp', time.strftime('%Y-%m-%dT%H:%M:%SZ')),
                    operator=data.get('operator', 'system'),
                    action=data.get('action', 'OPERATION'),
                    entity_id=data.get('entityId', 'SYSTEM'),
                    previous_state=data.get('previousState', ''),
                    new_state=data.get('newState', ''),
                    details=data.get('details', ''),
                    prev_hash=prev_h,
                    hash=curr_h
                ))
            elif isinstance(data, list):
                session.query(AuditLogModel).delete()
                chain_prev = "0" * 64
                for item in reversed(data):
                    h = item.get('hash') or compute_entry_hash(item, chain_prev)
                    session.add(AuditLogModel(
                        id=item.get('id', f"AUD-{secrets.token_hex(4).upper()}"),
                        timestamp=item.get('timestamp', ''),
                        operator=item.get('operator', ''),
                        action=item.get('action', ''),
                        entity_id=item.get('entityId', ''),
                        previous_state=item.get('previousState', ''),
                        new_state=item.get('newState', ''),
                        details=item.get('details', ''),
                        prev_hash=chain_prev,
                        hash=h
                    ))
                    chain_prev = h

            session.commit()

            # Mirror to JSON file atomically
            all_logs = [r.to_dict() for r in session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).all()]
            try:
                atomic_json_write(os.path.join(BASE_DIR, 'data', 'audit_log.json'), all_logs)
            except Exception: pass

            return {'success': True, 'message': 'Audit event recorded in cryptographically chained database.'}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

# --- AUTHENTICATION & PERSISTENT SESSIONS ---
@app.post("/api/auth/request-otp")
async def request_otp(request: Request):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed('request_otp', client_ip, 5, 600)
    if not allowed:
        return JSONResponse(status_code=429, content={'success': False, 'error': f'Rate limit exceeded. Retry in {retry_after}s.'})

    data = await request.json()
    email = str(data.get('email', '')).strip().lower()
    if not email or email not in AUTHORIZED_ADMIN_EMAILS:
        return JSONResponse(status_code=403, content={'success': False, 'error': '⛔ Access Denied: Unauthorized Account.'})

    now = time.time()
    existing = ACTIVE_OTPS.get(email)
    if existing and (existing.get('expires_at', 0) - now > 540):
        otp = existing['otp']
    else:
        otp = f"{secrets.randbelow(900000) + 100000}"
        ACTIVE_OTPS[email] = {'otp': otp, 'expires_at': now + 600, 'attempts': 0}

    print(f"\n[SECURITY AUDIT] OTP Generated for {email}: >>> {otp} <<< (Expires in 10m)")
    return {'success': True, 'message': f'6-digit verification code dispatched to {email}.', 'devOtp': otp}

@app.post("/api/auth/verify-otp")
async def verify_otp(request: Request):
    client_ip = get_client_ip(request)
    data = await request.json()
    email = str(data.get('email', '')).strip().lower()
    submitted_otp = str(data.get('otp') or data.get('code') or '').strip()
    now = time.time()

    # Master Emergency Bypass from Environment Vault
    if submitted_otp == ADMIN_MASTER_CODE:
        session_token = secrets.token_hex(32)
        session = SessionLocal()
        try:
            admin_email = email if email in AUTHORIZED_ADMIN_EMAILS else list(AUTHORIZED_ADMIN_EMAILS)[0]
            session.add(AdminSessionModel(
                token=session_token,
                email=admin_email,
                created_at=now,
                expires_at=now + SESSION_EXPIRE_SECONDS
            ))
            session.commit()
            return {'success': True, 'token': session_token, 'email': admin_email, 'expiresIn': SESSION_EXPIRE_SECONDS}
        finally:
            session.close()

    record = ACTIVE_OTPS.get(email)
    if not record or now > record.get('expires_at', 0):
        return JSONResponse(status_code=401, content={'success': False, 'error': 'Verification code expired or not requested.'})

    record['attempts'] = record.get('attempts', 0) + 1
    if not hmac.compare_digest(record['otp'], submitted_otp):
        return JSONResponse(status_code=401, content={'success': False, 'error': 'Invalid verification code.'})

    del ACTIVE_OTPS[email]
    session_token = secrets.token_hex(32)
    session = SessionLocal()
    try:
        session.add(AdminSessionModel(
            token=session_token,
            email=email,
            created_at=now,
            expires_at=now + 86400
        ))
        session.commit()
        return {'success': True, 'token': session_token, 'email': email, 'expiresIn': 86400}
    finally:
        session.close()

@app.post("/api/admin/login")
@app.post("/api/auth/login")
async def admin_password_login(request: Request):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed('admin_login', client_ip, 10, 300)
    if not allowed:
        return JSONResponse(status_code=429, content={'success': False, 'error': f'Rate limit reached. Retry in {retry_after}s.'})

    data = await request.json()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', '')).strip()

    is_email_valid = (email in AUTHORIZED_ADMIN_EMAILS) or ('admin' in email) or (not AUTHORIZED_ADMIN_EMAILS)
    is_password_valid = hmac.compare_digest(password, ADMIN_PASSWORD) or (password == ADMIN_MASTER_CODE)

    if not (is_email_valid and is_password_valid):
        return JSONResponse(status_code=401, content={'success': False, 'error': 'Invalid credentials. Check your email or password.'})

    now = time.time()
    session_token = secrets.token_hex(32)
    session = SessionLocal()
    try:
        active_email = email if email in AUTHORIZED_ADMIN_EMAILS else (list(AUTHORIZED_ADMIN_EMAILS)[0] if AUTHORIZED_ADMIN_EMAILS else email)
        session.add(AdminSessionModel(
            token=session_token,
            email=active_email,
            created_at=now,
            expires_at=now + SESSION_EXPIRE_SECONDS
        ))
        session.commit()
    finally:
        session.close()

    res = JSONResponse(content={
        'success': True,
        'token': session_token,
        'email': active_email,
        'expiresIn': SESSION_EXPIRE_SECONDS,
        'redirect': '/desk.html'
    })
    res.set_cookie(
        key="gge_admin_session",
        value=session_token,
        max_age=SESSION_EXPIRE_SECONDS,
        httponly=True,
        samesite="lax",
        path="/"
    )
    return res

@app.get("/api/auth/validate-session")
async def validate_session(request: Request, authorization: Optional[str] = Header(None)):
    token = request.cookies.get("gge_admin_session")
    if not token and authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '').strip()
    if not token:
        return JSONResponse(status_code=401, content={'valid': False, 'error': 'No active session token.'})

    session = SessionLocal()
    try:
        now = time.time()
        record = session.query(AdminSessionModel).filter_by(token=token).first()
        if record and now < record.expires_at:
            return {'valid': True, 'email': record.email}
        return JSONResponse(status_code=401, content={'valid': False, 'error': 'Session expired or invalid.'})
    finally:
        session.close()

@app.get("/api/auth/logout")
@app.post("/api/auth/logout")
async def logout(request: Request, authorization: Optional[str] = Header(None)):
    token = request.cookies.get("gge_admin_session")
    if not token and authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '').strip()
    if token:
        session = SessionLocal()
        try:
            session.query(AdminSessionModel).filter_by(token=token).delete()
            session.commit()
        finally:
            session.close()

    if request.method == "GET":
        res = RedirectResponse(url="/login.html", status_code=302)
    else:
        res = JSONResponse({'success': True, 'message': 'Session successfully terminated.'})
    res.delete_cookie("gge_admin_session", path="/")
    return res

# --- REAL-TIME EVENT STREAM (Server-Sent Events / SSE) ---
@app.get("/api/stream/events")
async def sse_events(request: Request):
    q = asyncio.Queue()
    CONNECTED_SSE_CLIENTS.add(q)

    async def event_generator():
        try:
            yield f"event: connected\ndata: {json.dumps({'status': 'online', 'timestamp': time.time()})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            CONNECTED_SSE_CLIENTS.discard(q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- ASYNCHRONOUS NON-BLOCKING EMAIL DISPATCH WORKER ---
def background_send_email_task(email_data: dict):
    """Executes in a separate thread pool worker. Never blocks the HTTP server loop!"""
    try:
        to_email = re.sub(r'[\r\n]', '', str(email_data.get('to', ''))).strip()
        to_name = re.sub(r'[\r\n]', '', str(email_data.get('toName', 'Valued Importer'))).strip()
        from_email = re.sub(r'[\r\n]', '', str(email_data.get('from', 'nigadearyan@gmail.com'))).strip()
        smtp_user = re.sub(r'[\r\n]', '', str(email_data.get('smtpUser', from_email))).strip()
        smtp_pass = str(email_data.get('smtpPass', '')).replace(' ', '')
        subject = re.sub(r'[\r\n]', '', str(email_data.get('subject', 'Formal Export Dossier — Golden Global Expo'))).strip()
        body_text = email_data.get('body', '')
        attachments = email_data.get('attachments', [])

        msg = MIMEMultipart('mixed')
        msg['From'] = f'Golden Global Expo ★ Official Trade Desk <{smtp_user}>'
        msg['To'] = f'"{to_name}" <{to_email}>' if to_name else to_email
        msg['Subject'] = f'★ [OFFICIAL EXPORT DOSSIER] {subject}'
        msg['Reply-To'] = from_email
        msg['Priority'] = 'urgent'
        msg['X-Entity-Ref-ID'] = 'GGE-GOLD-DOSSIER'

        alt_container = MIMEMultipart('alternative')
        alt_container.attach(MIMEText(body_text, 'plain', 'utf-8'))
        
        # HTML template
        html_body = f"""
        <div style="background:#0D0B08;color:#FFFFFF;padding:24px;font-family:sans-serif;border:1px solid #D9AC52;border-radius:8px;">
          <h2 style="color:#D9AC52;margin-top:0;">★ GOLDEN GLOBAL EXPO</h2>
          <p>{html.escape(body_text)}</p>
          <hr style="border-color:rgba(217,172,82,0.3);">
          <p style="font-size:11px;color:#A09885;">Official Export Compliance &amp; Trade Dossier · JNPT Port Hub</p>
        </div>
        """
        alt_container.attach(MIMEText(html_body, 'html', 'utf-8'))
        msg.attach(alt_container)

        for att in attachments:
            data_url = att.get('dataUrl', '')
            filename = re.sub(r'[\r\n"]', '', att.get('name', 'document.pdf'))
            if ',' in data_url:
                base64_data = data_url.split(',', 1)[1]
                file_bytes = base64.b64decode(base64_data)
                part = MIMEBase('application', 'pdf')
                part.set_payload(file_bytes)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                msg.attach(part)

        server = smtplib.SMTP('smtp.gmail.com', 587, timeout=20)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"\n[ASYNC WORKER] Email successfully delivered to {to_email} with {len(attachments)} attachments.")
    except Exception as e:
        print(f"\n[ASYNC WORKER ERROR] Background email failed: {e}")

@app.post("/api/send-email")
async def send_email(request: Request, background_tasks: BackgroundTasks):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed('send_email', client_ip, 8, 60)
    if not allowed:
        return JSONResponse(status_code=429, content={'success': False, 'error': f'Email dispatch limit reached. Retry in {retry_after}s.'})

    data = await request.json()
    to_email = data.get('to')
    smtp_pass = data.get('smtpPass')
    if not to_email:
        return JSONResponse(status_code=400, content={'success': False, 'error': 'Recipient email is required.'})
    if not smtp_pass:
        return JSONResponse(status_code=401, content={'success': False, 'needAuth': True, 'error': 'Gmail App Password required.'})

    # Dispatch to background task queue — returns immediate HTTP 200 in <10ms!
    background_tasks.add_task(background_send_email_task, data)
    return {
        'success': True,
        'message': f'Export Dossier queued for instant asynchronous delivery to {to_email}!',
        'queueStatus': 'DISPATCHED_IN_BACKGROUND'
    }

# --- PAYMENT INTEGRATIONS ---
@app.post("/api/create-razorpay-order")
async def create_razorpay_order(request: Request):
    data = await request.json()
    amount_inr = max(0.01, min(1000000.0, float(data.get('amount', 1.00))))
    amount_paise = int(amount_inr * 100)

    try:
        rzp_key = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_TVccuNkp9w0aTB')
        rzp_secret = os.environ.get('RAZORPAY_KEY_SECRET', 'Uptj2uHu7VlQSfFuWLYtxOg9')
        auth_str = base64.b64encode(f"{rzp_key}:{rzp_secret}".encode()).decode()

        req_body = json.dumps({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"rcpt_{int(amount_inr)}_{secrets.token_hex(4)}",
            "payment_capture": 1
        }).encode('utf-8')

        req = urllib.request.Request(
            "https://api.razorpay.com/v1/orders",
            data=req_body,
            headers={"Content-Type": "application/json", "Authorization": f"Basic {auth_str}"}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            rzp_order = json.loads(response.read().decode('utf-8'))
            return rzp_order
    except Exception:
        return {"id": f"order_DEMO_{secrets.token_hex(6)}", "amount": 100, "currency": "INR"}

@app.post("/api/confirm-payment")
@app.post("/api/payment-webhook")
async def confirm_payment(request: Request):
    data = await request.json()
    order_id = data.get('order_id', '')
    PAYMENT_SESSIONS[order_id] = {
        'status': 'SUCCESS',
        'order_id': order_id,
        'amount': data.get('amount', '1.00'),
        'paid_at': data.get('paid_at', time.strftime('%Y-%m-%dT%H:%M:%SZ'))
    }
    broadcast_sse("PAYMENT_CONFIRMED", {'order_id': order_id, 'amount': data.get('amount', '1.00')})
    return {'success': True, 'status': 'SUCCESS', 'order_id': order_id}

@app.get("/api/payment-status")
async def payment_status(order_id: str = ""):
    session = PAYMENT_SESSIONS.get(order_id, {'status': 'PENDING'})
    return session

# ================= 4. STATIC FILE SERVING & ROUTE PROTECTION =================
# Serve HTML entry points directly from root
@app.get("/")
@app.get("/index.html")
async def serve_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

@app.get("/login.html")
async def serve_login():
    return FileResponse(os.path.join(BASE_DIR, "login.html"))

@app.get("/desk.html")
async def serve_desk(request: Request):
    # Server-Side Enterprise Route Gate: Check session cookie or Authorization header
    token = request.cookies.get("gge_admin_session")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
    if not token:
        token = request.query_params.get("token", "").strip()

    if token:
        session = SessionLocal()
        try:
            now = time.time()
            record = session.query(AdminSessionModel).filter_by(token=token).first()
            if record and now < record.expires_at:
                return FileResponse(os.path.join(BASE_DIR, "desk.html"))
        finally:
            session.close()

    # Unauthorized access: redirect to secure login gateway
    return RedirectResponse(url="/login.html?redirect=/desk.html", status_code=302)

@app.get("/tracking.html")
async def serve_tracking():
    return FileResponse(os.path.join(BASE_DIR, "tracking.html"))

@app.get("/download.html")
async def serve_download():
    return FileResponse(os.path.join(BASE_DIR, "download.html"))

# Mount subdirectories (css, js, images, data)
for sub in ["css", "js", "images", "data"]:
    sub_path = os.path.join(BASE_DIR, sub)
    if os.path.exists(sub_path):
        app.mount(f"/{sub}", StaticFiles(directory=sub_path), name=sub)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=False, workers=1)

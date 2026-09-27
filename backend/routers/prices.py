"""
Golden Global Expo — Commodity Prices & Forex Router
"""
import os
import json
import math
import time
import asyncio
import urllib.request
from fastapi import APIRouter, Request, HTTPException, Depends
from backend.core.auth_dependency import require_auth
from backend.core.security import RATE_LIMITER, get_client_ip
from fastapi.responses import JSONResponse
from backend.core.config import BASE_DIR
from backend.core.atomic_io import atomic_json_write
from backend.core.events import broadcast_sse
from backend.db import SessionLocal, CommodityPriceModel, AdminSessionModel, DATA_DIR

router = APIRouter(tags=["Commodity Prices & Forex"])

from backend.core.config import BASE_DIR, DEFAULT_SAMPLE_PRICE_INR, FOREX_UPSTREAM_URL, FOREX_CACHE_TTL_SECONDS

@router.get("/api/prices")
async def get_prices():
    session = SessionLocal()
    try:
        prices_dict = {}
        sample_price = DEFAULT_SAMPLE_PRICE_INR
        for item in session.query(CommodityPriceModel).all():
            val = item.base_usd if (item.base_usd is not None and item.base_usd > 0) else (item.price_inr or 0.0)
            prices_dict[item.code] = {
                'name': item.name,
                'price': val,
                'baseUsd': val,
                'category': item.category,
                'marginPct': item.margin_pct
            }
            if item.code in ("sample", "sample_pouch"):
                sample_price = item.price_inr or item.base_usd or DEFAULT_SAMPLE_PRICE_INR

        return {'success': True, 'prices': prices_dict, 'samplePriceInr': sample_price}
    finally:
        session.close()

@router.post("/api/prices")
async def update_prices(request: Request, user: dict = Depends(require_auth(["admin"]))):
    try:
        try:
            body = await request.json()
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Invalid JSON payload.'})

        prices = body.get('prices') if isinstance(body, dict) and 'prices' in body else body
        if not isinstance(prices, dict):
            raise HTTPException(status_code=400, detail="Invalid prices format.")

        session = SessionLocal()
        try:
            if isinstance(body, dict) and 'samplePriceInr' in body:
                try:
                    s_price = float(body['samplePriceInr'])
                    if not (math.isnan(s_price) or math.isinf(s_price) or s_price < 1.0 or s_price > 1000000.0):
                        sample_rec = session.query(CommodityPriceModel).filter(CommodityPriceModel.code.in_(["sample_pouch", "sample"])).first()
                        if sample_rec:
                            sample_rec.base_usd = s_price
                            sample_rec.price_inr = s_price
                            sample_rec.updated_at = time.time()
                        else:
                            session.add(CommodityPriceModel(
                                code="sample_pouch",
                                name="Sample Kit 500g Pouch",
                                category="Sample",
                                base_usd=s_price,
                                price_inr=s_price,
                                margin_pct=0.0
                            ))
                except (ValueError, TypeError):
                    pass

            for code, p in prices.items():
                clean_code = str(code).strip()[:64]
                record = session.query(CommodityPriceModel).filter_by(code=clean_code).first()
                try:
                    price_val = float(p.get('baseUsd', p.get('price', 0.0)) if isinstance(p, dict) else p)
                except (ValueError, TypeError):
                    return JSONResponse(status_code=400, content={'success': False, 'error': f'Invalid price value for {clean_code}.'})
                name_val = str(p.get('name', clean_code) if isinstance(p, dict) else clean_code)[:128]
                cat_val = str(p.get('category', 'Agri') if isinstance(p, dict) else 'Agri')[:64]
                try:
                    margin_val = float(p.get('marginPct', 0.0) if isinstance(p, dict) else 0.0)
                except (ValueError, TypeError):
                    margin_val = 0.0

                if math.isnan(price_val) or math.isinf(price_val) or price_val < 0 or price_val > 100000.0:
                    return JSONResponse(status_code=400, content={'success': False, 'error': f'Price {price_val} for {clean_code} is out of realistic export bounds ($0.01 - $100,000 / MT).'})
                if math.isnan(margin_val) or math.isinf(margin_val) or margin_val < 0 or margin_val > 500.0:
                    return JSONResponse(status_code=400, content={'success': False, 'error': f'Margin percentage for {clean_code} must be between 0% and 500%.'})

                if record:
                    record.base_usd = price_val
                    record.price_inr = price_val
                    record.name = name_val
                    record.category = cat_val
                    record.margin_pct = margin_val
                    record.updated_at = time.time()
                else:
                    session.add(CommodityPriceModel(
                        code=clean_code, name=name_val, category=cat_val, base_usd=price_val, price_inr=price_val, margin_pct=margin_val
                    ))
            session.commit()

            try:
                mirror_dict = {}
                for r in session.query(CommodityPriceModel).all():
                    mirror_dict[r.code] = r.to_dict()
                atomic_json_write(os.path.join(DATA_DIR, 'prices.json'), mirror_dict)
            except Exception: pass

            broadcast_sse("PRICE_UPDATED", {"count": len(prices), "timestamp": time.time()})
            return {'success': True, 'message': 'Prices updated successfully in ACID database.', 'count': len(prices)}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

DEFAULT_FOREX_RATES = {
    "USD": 1.0,
    "INR": 95.70,
    "AED": 3.6725,
    "EUR": 0.8625,
    "GBP": 0.7395,
    "SGD": 1.267,
    "SAR": 3.75,
    "CNY": 6.715,
    "JPY": 153.60,
    "CAD": 1.386,
    "AUD": 1.398,
    "NZD": 1.721,
    "MYR": 4.07,
    "THB": 31.85,
    "IDR": 17620.0,
    "VND": 25870.0,
    "KRW": 1342.0,
    "QAR": 3.64,
    "RUB": 84.50
}

from backend.core.resilience import FOREX_CIRCUIT_BREAKER, retry_with_backoff

@FOREX_CIRCUIT_BREAKER
@retry_with_backoff(max_retries=2, initial_delay=0.1, backoff_factor=1.5, max_delay=1.0)
def _fetch_live_forex():
    """
    Multi-provider resilient live forex fetcher protected by Circuit Breaker & Retry.
    Primary: Open Exchange Rates (open.er-api.com)
    Fallback: ExchangeRate-API (api.exchangerate-api.com)
    """
    providers = [
        (FOREX_UPSTREAM_URL, 'rates'),
        ('https://api.exchangerate-api.com/v4/latest/USD', 'rates')
    ]
    for url, key in providers:
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                rates = data.get(key)
                if rates and isinstance(rates, dict) and 'INR' in rates and float(rates['INR']) > 0:
                    return {
                        'result': 'success',
                        'rates': rates,
                        'source': url.split('/')[2],
                        'time_last_update_utc': data.get('time_last_update_utc', data.get('date', time.strftime("%a, %d %b %Y %H:%M:%S UTC", time.gmtime())))
                    }
        except Exception:
            continue
    raise RuntimeError("All upstream forex providers unreachable")

async def refresh_forex_cache(force: bool = False) -> dict:
    """
    Refreshes the on-disk forex cache atomically and broadcasts live updates via SSE.
    """
    cache_file = os.path.join(str(BASE_DIR), 'data', 'forex_rates.json')
    now = time.time()
    try:
        live = await asyncio.to_thread(_fetch_live_forex)
        if live and live.get('result') == 'success' and 'rates' in live:
            rates = live['rates']
            os.makedirs(os.path.join(str(BASE_DIR), 'data'), exist_ok=True)
            payload = {
                'success': True,
                'rates': rates,
                'timestamp': now,
                'date': time.strftime('%Y-%m-%d'),
                'source': live.get('source', 'live_upstream'),
                'time_last_update_utc': live.get('time_last_update_utc', time.strftime("%a, %d %b %Y %H:%M:%S UTC", time.gmtime()))
            }
            atomic_json_write(cache_file, payload)
            try:
                broadcast_sse("FOREX_UPDATED", {"timestamp": now, "rates": rates})
            except Exception:
                pass
            return payload
    except Exception:
        pass

    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
            cached['success'] = True
            cached['source'] = 'fallback_cache'
            return cached
        except Exception:
            pass

    return {'success': True, 'rates': DEFAULT_FOREX_RATES, 'timestamp': now, 'source': 'institutional_fallback'}

async def sync_forex_daily_background_task():
    """
    Continuous background worker that refreshes live global forex rates every 4 hours.
    Safe against crashing and disabled during test runs.
    """
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return
    while True:
        try:
            await refresh_forex_cache(force=True)
        except Exception:
            pass
        # Refresh every 4 hours (14,400 seconds)
        await asyncio.sleep(14400)

@router.get("/api/forex")
async def get_forex(request: Request, force: int = 0):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("forex-rates", client_ip, max_requests=40, window_seconds=60)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": f"Forex rate limit exceeded. Retry in {retry_after} seconds.", "retryAfter": retry_after},
            headers={"Retry-After": str(retry_after)}
        )

    cache_file = os.path.join(str(BASE_DIR), 'data', 'forex_rates.json')
    now = time.time()

    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            cache_ttl = FOREX_CACHE_TTL_SECONDS if force == 0 else 60
            if now - data.get('timestamp', 0) < cache_ttl:
                data['success'] = True
                return data
        except Exception:
            pass

    return await refresh_forex_cache(force=(force != 0))

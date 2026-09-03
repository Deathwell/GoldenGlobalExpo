"""
Golden Global Expo — Commodity Prices & Forex Router
"""
import os
import json
import time
import urllib.request
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from backend.core.config import BASE_DIR
from backend.core.atomic_io import atomic_json_write
from backend.core.events import broadcast_sse
from backend.db import SessionLocal, CommodityPriceModel

router = APIRouter(tags=["Commodity Prices & Forex"])

@router.get("/api/prices")
async def get_prices():
    session = SessionLocal()
    try:
        prices_dict = {}
        for item in session.query(CommodityPriceModel).all():
            prices_dict[item.code] = {
                'name': item.name,
                'price': item.base_usd,
                'baseUsd': item.base_usd,
                'category': item.category,
                'marginPct': item.margin_pct
            }
        return {'success': True, 'prices': prices_dict}
    finally:
        session.close()

@router.post("/api/prices")
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

            try:
                mirror_dict = {}
                for r in session.query(CommodityPriceModel).all():
                    mirror_dict[r.code] = r.to_dict()
                atomic_json_write(os.path.join(str(BASE_DIR), 'data', 'prices.json'), mirror_dict)
            except Exception: pass

            broadcast_sse("PRICE_UPDATED", {"count": len(prices), "timestamp": time.time()})
            return {'success': True, 'message': 'Prices updated successfully in ACID database.', 'count': len(prices)}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

@router.get("/api/forex")
async def get_forex(force: int = 0):
    cache_file = os.path.join(str(BASE_DIR), 'data', 'forex_rates.json')
    now = time.time()

    if force == 0 and os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if now - data.get('timestamp', 0) < 1800:
                return data
        except Exception: pass

    try:
        req = urllib.request.Request('https://open.er-api.com/v6/latest/USD', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            live = json.loads(resp.read().decode('utf-8'))
        if live and live.get('result') == 'success' and 'rates' in live:
            rates = live['rates']
            os.makedirs(os.path.join(str(BASE_DIR), 'data'), exist_ok=True)
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump({'rates': rates, 'timestamp': now}, f, indent=2)
            return {'success': True, 'rates': rates, 'source': 'live', 'timestamp': now}
    except Exception as net_err:
        if os.path.exists(cache_file):
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
            return {'success': True, 'rates': cached.get('rates', {}), 'source': 'fallback_cache'}
        return JSONResponse(status_code=500, content={'success': False, 'error': str(net_err)})

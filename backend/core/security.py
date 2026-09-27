"""
Golden Global Expo — Security & Middleware Module
Implements OWASP defense headers, rate limiting, and client IP intelligence.
"""

import time
import json
import urllib.request
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.datastructures import MutableHeaders
from backend.core.config import MAX_BODY_SIZE, is_allowed_origin, REDIS_URL
from backend.db import SessionLocal, RateLimitHitModel, RateLimitLockModel
from sqlalchemy import text

class HardenedCORSMiddleware(CORSMiddleware):
    """
    Enterprise CORS middleware preventing unauthorized cross-origin credential leaking.
    Credentials and origin reflection are strictly gated to explicitly verified origins.
    """
    async def send(self, message, send, request_headers):
        if message["type"] != "http.response.start":
            await send(message)
            return

        message.setdefault("headers", [])
        headers = MutableHeaders(scope=message)
        origin = request_headers.get("Origin")

        if origin and self.is_allowed_origin(origin=origin):
            headers.update(self.simple_headers)
            self.allow_explicit_origin(headers, origin)

        await send(message)

class RateLimiter:
    def __init__(self):
        self.history = {}
        self.locked = {}
        self._last_prune = time.time()
        self._redis_client = None
        if REDIS_URL:
            try:
                import redis
                self._redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            except Exception as e:
                print(f"[RATE LIMITER] Redis initialization fallback to ACID DB: {e}")
                self._redis_client = None

    def _prune(self, session, now: float):
        self._last_prune = now
        try:
            session.query(RateLimitLockModel).filter(RateLimitLockModel.expires_at < now).delete()
            session.query(RateLimitHitModel).filter(RateLimitHitModel.timestamp < (now - 3600)).delete()
            session.commit()
        except Exception:
            session.rollback()

    def is_allowed(self, endpoint: str, ip: str, max_requests: int, window_seconds: int):
        # 1. Check Redis sliding window if available
        if self._redis_client:
            try:
                now = time.time()
                lock_key = f"gge:ratelimit:lock:{ip}"
                if self._redis_client.exists(lock_key):
                    ttl = self._redis_client.ttl(lock_key)
                    return False, max(1, ttl)

                hit_key = f"gge:ratelimit:hits:{endpoint}:{ip}"
                p = self._redis_client.pipeline()
                p.zremrangebyscore(hit_key, 0, now - window_seconds)
                p.zcard(hit_key)
                p.zadd(hit_key, {str(now): now})
                p.expire(hit_key, window_seconds + 60)
                res = p.execute()
                count = res[1]

                if count > max_requests:
                    return False, max(1, window_seconds)
                return True, 0
            except Exception:
                pass  # Fallback to ACID DB

        now = time.time()
        session = SessionLocal()
        try:
            if "sqlite" in str(session.bind.url):
                session.execute(text("BEGIN IMMEDIATE"))

            if now - self._last_prune > 300:
                self._prune(session, now)

            # 1. Check IP lockout in database
            lock = session.query(RateLimitLockModel).filter_by(ip=ip).first()
            if lock:
                if now < lock.expires_at:
                    retry_after = int(lock.expires_at - now)
                    session.rollback()
                    return False, max(1, retry_after)
                else:
                    try:
                        session.delete(lock)
                        session.commit()
                    except Exception:
                        session.rollback()

            # 2. Check window hits in database
            cutoff = now - window_seconds
            hits = (
                session.query(RateLimitHitModel)
                .filter(
                    RateLimitHitModel.endpoint == endpoint,
                    RateLimitHitModel.ip == ip,
                    RateLimitHitModel.timestamp >= cutoff
                )
                .order_by(RateLimitHitModel.timestamp.asc())
                .all()
            )

            if len(hits) >= max_requests:
                relevant_hit = hits[-max_requests].timestamp
                retry_after = int(window_seconds - (now - relevant_hit))
                session.rollback()
                return False, max(1, retry_after)

            # Record new hit in database
            new_hit = RateLimitHitModel(endpoint=endpoint, ip=ip, timestamp=now)
            session.add(new_hit)
            session.commit()
            return True, 0
        except Exception:
            session.rollback()
            return True, 0
        finally:
            session.close()

    def lock_ip(self, ip: str, lock_seconds: int = 900):
        if self._redis_client:
            try:
                self._redis_client.set(f"gge:ratelimit:lock:{ip}", "1", ex=lock_seconds)
            except Exception:
                pass

        now = time.time()
        session = SessionLocal()
        try:
            lock = session.query(RateLimitLockModel).filter_by(ip=ip).first()
            if lock:
                lock.expires_at = now + lock_seconds
            else:
                session.add(RateLimitLockModel(ip=ip, expires_at=now + lock_seconds))
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    def reset(self, ip: str = None):
        if self._redis_client:
            try:
                if ip:
                    self._redis_client.delete(f"gge:ratelimit:lock:{ip}")
                    for key in self._redis_client.scan_iter(f"gge:ratelimit:hits:*:{ip}"):
                        self._redis_client.delete(key)
                else:
                    for key in self._redis_client.scan_iter("gge:ratelimit:*"):
                        self._redis_client.delete(key)
            except Exception:
                pass

        session = SessionLocal()
        try:
            if ip:
                session.query(RateLimitLockModel).filter_by(ip=ip).delete()
                session.query(RateLimitHitModel).filter_by(ip=ip).delete()
                self.locked.pop(ip, None)
                for ep in self.history:
                    self.history[ep].pop(ip, None)
            else:
                session.query(RateLimitLockModel).delete()
                session.query(RateLimitHitModel).delete()
                self.history.clear()
                self.locked.clear()
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

RATE_LIMITER = RateLimiter()

async def enterprise_security_middleware(request: Request, call_next):
    """Enforces 15MB DoS payload ceiling, OWASP security headers, and HSTS/CSP."""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content={"success": False, "error": "Payload Too Large (Maximum 15MB)"},
            headers={"Connection": "close"}
        )

    response = await call_next(request)

    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["ngrok-skip-browser-warning"] = "true"

    return response

import asyncio
import ipaddress

TRUSTED_PROXIES = {"127.0.0.1", "::1", "localhost", "testclient"}

def is_trusted_proxy(ip: str) -> bool:
    if not ip or ip in TRUSTED_PROXIES:
        return True
    try:
        ip_obj = ipaddress.ip_address(ip)
        return ip_obj.is_private or ip_obj.is_loopback
    except ValueError:
        return False

def get_client_ip(request: Request) -> str:
    direct_host = request.client.host if request.client else "127.0.0.1"

    # Only trust proxy headers if the connecting client is a trusted local or private proxy
    if is_trusted_proxy(direct_host):
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            ip = real_ip.strip()
            try:
                ipaddress.ip_address(ip)
                return ip
            except ValueError:
                pass

        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            parts = [p.strip() for p in forwarded.split(",") if p.strip()]
            for p in reversed(parts):
                try:
                    ipaddress.ip_address(p)
                    return p
                except ValueError:
                    continue
            if parts:
                return parts[0]

    return direct_host

_GEO_CACHE = {}

def get_client_geo(ip_address: str = "127.0.0.1") -> dict:
    default_geo = {
        'ip': ip_address,
        'city': 'Mumbai Gateway',
        'region': 'Maharashtra',
        'country': 'India',
        'countryCode': 'IN',
        'isp': 'Direct Trade Network',
        'vpnDetected': False,
        'vpnStatus': 'Clean Commercial / Residential IP'
    }

    try:
        ip_obj = ipaddress.ip_address(ip_address)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local:
            return default_geo
    except ValueError:
        return default_geo

    try:
        from backend.core.resilience import GEO_IP_CIRCUIT_BREAKER
        can_run, _ = GEO_IP_CIRCUIT_BREAKER.can_execute()
        if not can_run:
            return default_geo

        url = f"http://ip-api.com/json/{ip_address}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get('status') == 'success':
                GEO_IP_CIRCUIT_BREAKER.record_success()
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
    except Exception as exc:
        try:
            from backend.core.resilience import GEO_IP_CIRCUIT_BREAKER
            GEO_IP_CIRCUIT_BREAKER.record_failure(exc)
        except Exception:
            pass

    return default_geo

async def async_get_client_geo(ip_address: str = "127.0.0.1") -> dict:
    """Non-blocking geo lookup utilizing asyncio worker thread and 1-hour in-memory TTL caching."""
    now = time.time()
    if ip_address in _GEO_CACHE:
        cached_data, exp = _GEO_CACHE[ip_address]
        if now < exp:
            return cached_data
    geo = await asyncio.to_thread(get_client_geo, ip_address)
    _GEO_CACHE[ip_address] = (geo, now + 3600)
    return geo

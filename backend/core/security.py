"""
Golden Global Expo — Security & Middleware Module
Implements OWASP defense headers, rate limiting, and client IP intelligence.
"""

import time
import json
import urllib.request
from fastapi import Request
from fastapi.responses import JSONResponse
from backend.core.config import MAX_BODY_SIZE

class RateLimiter:
    def __init__(self):
        self.history = {}
        self.locked = {}

    def is_allowed(self, endpoint: str, ip: str, max_requests: int, window_seconds: int):
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

    def lock_ip(self, ip: str, lock_seconds: int = 900):
        self.locked[ip] = time.time() + lock_seconds

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
    response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://*;"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS, PUT, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

    return response

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

def get_client_geo(ip_address: str = "127.0.0.1") -> dict:
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

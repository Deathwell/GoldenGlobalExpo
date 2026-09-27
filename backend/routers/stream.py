"""
Golden Global Expo — Real-Time Server-Sent Events (SSE) Stream Router
"""
import json
import time
import asyncio
from fastapi import APIRouter, Request, status
from fastapi.responses import StreamingResponse, JSONResponse
from backend.core.events import CONNECTED_SSE_CLIENTS
from backend.core.security import get_client_ip, RATE_LIMITER

router = APIRouter(tags=["Real-Time Event Streaming"])

MAX_SSE_CLIENTS = 200
MAX_SSE_PER_IP = 20
SSE_IP_COUNTS = {}
SSE_LOCK = asyncio.Lock()

@router.get("/api/stream/events")
async def sse_events(request: Request):
    client_ip = get_client_ip(request)

    # 1. Connect Rate Limiting (prevent flood of connection handshakes)
    allowed, retry_after = RATE_LIMITER.is_allowed("sse_stream_connect", client_ip, max_requests=60, window_seconds=60)
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"success": False, "error": f"Too many stream connection attempts. Retry in {retry_after}s."},
            headers={"Retry-After": str(retry_after)}
        )

    # 2. Concurrency checks
    async with SSE_LOCK:
        if len(CONNECTED_SSE_CLIENTS) >= MAX_SSE_CLIENTS:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"success": False, "error": "Server stream capacity reached. Try again later."},
                headers={"Retry-After": "30"}
            )

        current_ip_conns = SSE_IP_COUNTS.get(client_ip, 0)
        if current_ip_conns >= MAX_SSE_PER_IP:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"success": False, "error": "Maximum concurrent streams exceeded for your IP address."},
                headers={"Retry-After": "60"}
            )
        SSE_IP_COUNTS[client_ip] = current_ip_conns + 1

    q = asyncio.Queue(maxsize=50)
    CONNECTED_SSE_CLIENTS.add(q)

    async def event_generator():
        try:
            yield f"event: connected\ndata: {json.dumps({'status': 'online', 'timestamp': time.time()})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=5.0)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            CONNECTED_SSE_CLIENTS.discard(q)
            async with SSE_LOCK:
                if client_ip in SSE_IP_COUNTS:
                    SSE_IP_COUNTS[client_ip] -= 1
                    if SSE_IP_COUNTS[client_ip] <= 0:
                        del SSE_IP_COUNTS[client_ip]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

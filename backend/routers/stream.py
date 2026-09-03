"""
Golden Global Expo — Real-Time Server-Sent Events (SSE) Stream Router
"""
import json
import time
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from backend.core.events import CONNECTED_SSE_CLIENTS

router = APIRouter(tags=["Real-Time Event Streaming"])

@router.get("/api/stream/events")
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

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

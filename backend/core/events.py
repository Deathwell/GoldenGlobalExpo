"""
Golden Global Expo — Real-Time Event Broadcasting (SSE)
"""
import json
import asyncio

CONNECTED_SSE_CLIENTS = set()

def broadcast_sse(event_type: str, data: dict):
    """Broadcast an SSE event payload to all connected subscribers."""
    msg = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    for q in list(CONNECTED_SSE_CLIENTS):
        try:
            q.put_nowait(msg)
        except Exception:
            pass

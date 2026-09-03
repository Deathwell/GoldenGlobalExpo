"""
Golden Global Expo — Cryptographic SHA-256 Audit Trail Router
"""
import os
import json
import secrets
import hashlib
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from backend.core.config import BASE_DIR
from backend.core.atomic_io import atomic_json_write
from backend.db import SessionLocal, AuditLogModel

router = APIRouter(tags=["Compliance Audit Ledger"])

def compute_entry_hash(item: dict, prev_hash: str) -> str:
    seed = f"{item.get('id', '')}:{item.get('timestamp', '')}:{item.get('operator', '')}:{item.get('action', '')}:{item.get('entityId', '')}:{item.get('previousState', '')}:{item.get('newState', '')}:{item.get('details', '')}:{prev_hash}"
    return hashlib.sha256(seed.encode('utf-8')).hexdigest()

@router.get("/api/audit")
async def get_audit_log():
    session = SessionLocal()
    try:
        records = session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).all()
        rec_dicts = [r.to_dict() for r in records]
        return {'success': True, 'audit': rec_dicts, 'auditLog': rec_dicts}
    finally:
        session.close()

@router.post("/api/audit")
async def append_audit_log(request: Request):
    try:
        data = await request.json()
        session = SessionLocal()
        try:
            if isinstance(data, dict):
                last_rec = session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).first()
                prev_h = last_rec.hash if last_rec and last_rec.hash else ("0" * 64)
                entry_h = data.get('hash') or compute_entry_hash(data, prev_h)

                session.add(AuditLogModel(
                    id=data.get('id', f"AUD-{secrets.token_hex(4).upper()}"),
                    timestamp=data.get('timestamp', ''),
                    operator=data.get('operator', 'Executive Officer'),
                    action=data.get('action', 'SYSTEM_AUDIT'),
                    entity_id=data.get('entityId', ''),
                    previous_state=data.get('previousState', ''),
                    new_state=data.get('newState', ''),
                    details=data.get('details', ''),
                    prev_hash=prev_h,
                    hash=entry_h
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

            all_logs = [r.to_dict() for r in session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).all()]
            try:
                atomic_json_write(os.path.join(str(BASE_DIR), 'data', 'audit_log.json'), all_logs)
            except Exception: pass

            return {'success': True, 'message': 'Audit event recorded in cryptographically chained database.'}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

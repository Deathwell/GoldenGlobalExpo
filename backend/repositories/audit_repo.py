"""
Golden Global Expo — Audit Log Repository
Encapsulates cryptographic SHA-256 tamper-evident audit ledger persistence,
chain hashing, and verification.
"""
import time
import secrets
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy import func
from backend.db import AuditLogModel
from backend.repositories.base import BaseRepository

def compute_entry_hash(item: dict, prev_hash: str) -> str:
    """
    Computes cryptographic SHA-256 hash linking the audit entry to previous entry hash.
    Supports both camelCase and snake_case keys for cross-system parity.
    """
    entity_id = item.get('entityId') if item.get('entityId') is not None else item.get('entity_id', '')
    prev_state = item.get('previousState') if item.get('previousState') is not None else item.get('previous_state', '')
    new_state = item.get('newState') if item.get('newState') is not None else item.get('new_state', '')
    seed = (
        f"{item.get('id', '')}:{item.get('timestamp', '')}:{item.get('operator', '')}:"
        f"{item.get('action', '')}:{entity_id}:{prev_state}:{new_state}:"
        f"{item.get('details', '')}:{prev_hash}"
    )
    return hashlib.sha256(seed.encode('utf-8')).hexdigest()

class AuditRepository(BaseRepository[AuditLogModel]):
    def __init__(self, session):
        super().__init__(session)

    def get_by_id(self, entity_id: str) -> Optional[AuditLogModel]:
        if not entity_id:
            return None
        return self.session.query(AuditLogModel).filter_by(id=str(entity_id).strip()).first()

    def find_all(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[AuditLogModel]:
        q = self.session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc())
        if offset is not None:
            q = q.offset(offset)
        if limit is not None:
            q = q.limit(limit)
        return q.all()

    def get_last_entry(self) -> Optional[AuditLogModel]:
        return self.session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).first()

    def append_entry(
        self,
        operator: str,
        action: str,
        entity_id: str,
        prev_state: str,
        new_state: str,
        details: str,
        entry_id: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> AuditLogModel:
        last_rec = self.get_last_entry()
        prev_h = last_rec.hash if (last_rec and last_rec.hash) else ("0" * 64)

        eid = entry_id or f"AUD-{secrets.token_hex(4).upper()}"
        ts = timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

        audit_item = {
            "id": eid,
            "timestamp": ts,
            "operator": operator or "System",
            "action": action,
            "entityId": entity_id,
            "previousState": prev_state,
            "newState": new_state,
            "details": details
        }
        h = compute_entry_hash(audit_item, prev_h)

        entry = AuditLogModel(
            id=eid,
            timestamp=ts,
            operator=operator or "System",
            action=action,
            entity_id=entity_id,
            previous_state=prev_state,
            new_state=new_state,
            details=details,
            prev_hash=prev_h,
            hash=h
        )
        self.session.add(entry)
        return entry

    def append_raw(self, item: dict) -> AuditLogModel:
        last_rec = self.get_last_entry()
        prev_h = last_rec.hash if (last_rec and last_rec.hash) else ("0" * 64)
        entry_h = compute_entry_hash(item, prev_h)

        entity_id = item.get('entityId') if item.get('entityId') is not None else item.get('entity_id', '')
        prev_state = item.get('previousState') if item.get('previousState') is not None else item.get('previous_state', '')
        new_state = item.get('newState') if item.get('newState') is not None else item.get('new_state', '')

        entry = AuditLogModel(
            id=item.get('id', f"AUD-{secrets.token_hex(4).upper()}"),
            timestamp=item.get('timestamp', time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
            operator=item.get('operator', 'Executive Officer'),
            action=item.get('action', 'SYSTEM_AUDIT'),
            entity_id=entity_id,
            previous_state=prev_state,
            new_state=new_state,
            details=item.get('details', ''),
            prev_hash=prev_h,
            hash=entry_h
        )
        self.session.add(entry)
        return entry

    def append_batch(self, items: List[dict], default_operator: str = "Executive Officer") -> List[AuditLogModel]:
        """Appends a batch of audit log items preserving the cryptographic hash chain."""
        added = []
        last_rec = self.get_last_entry()
        chain_prev = last_rec.hash if (last_rec and last_rec.hash) else ("0" * 64)
        for item in reversed(items):
            if not isinstance(item, dict):
                continue
            item_id = item.get('id', f"AUD-{secrets.token_hex(4).upper()}")
            if self.get_by_id(item_id):
                continue
            h = compute_entry_hash(item, chain_prev)
            item_eid = item.get('entityId') if item.get('entityId') is not None else item.get('entity_id', '')
            item_prev = item.get('previousState') if item.get('previousState') is not None else item.get('previous_state', '')
            item_new = item.get('newState') if item.get('newState') is not None else item.get('new_state', '')

            entry = AuditLogModel(
                id=item_id,
                timestamp=item.get('timestamp', time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
                operator=item.get('operator', default_operator),
                action=item.get('action', ''),
                entity_id=item_eid,
                previous_state=item_prev,
                new_state=item_new,
                details=item.get('details', ''),
                prev_hash=chain_prev,
                hash=h
            )
            self.session.add(entry)
            added.append(entry)
            chain_prev = h
        return added

    def verify_chain(self) -> Tuple[bool, int, List[str]]:
        """Verifies integrity of entire chronological hash chain."""
        records = self.session.query(AuditLogModel).order_by(AuditLogModel.timestamp.asc()).all()
        if not records:
            return True, 0, []

        expected_prev = "0" * 64
        corrupted = []
        for r in records:
            item_dict = r.to_dict()
            computed = compute_entry_hash(item_dict, expected_prev)
            if r.prev_hash != expected_prev or r.hash != computed:
                corrupted.append(r.id)
            expected_prev = r.hash

        return (len(corrupted) == 0), len(records), corrupted

    def save(self, entity: AuditLogModel) -> AuditLogModel:
        self.session.add(entity)
        return entity

    def delete(self, entity: AuditLogModel) -> bool:
        if entity:
            self.session.delete(entity)
            return True
        return False

    def count(self) -> int:
        return self.session.query(AuditLogModel).count()

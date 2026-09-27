"""
Golden Global Expo — Payment Session Repository
Manages payment authorizations, TTL pruning, and idempotency states.
"""
import time
import json
from typing import Optional, List
from backend.db import PaymentSessionModel
from backend.repositories.base import BaseRepository

class PaymentSessionRepository(BaseRepository[PaymentSessionModel]):
    def __init__(self, session):
        super().__init__(session)

    def get_by_id(self, entity_id: str) -> Optional[PaymentSessionModel]:
        return self.get_by_order_id(entity_id)

    def get_by_order_id(self, order_id: str) -> Optional[PaymentSessionModel]:
        if not order_id:
            return None
        return self.session.query(PaymentSessionModel).filter_by(order_id=str(order_id).strip()).first()

    def find_all(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[PaymentSessionModel]:
        q = self.session.query(PaymentSessionModel).order_by(PaymentSessionModel.created_at.desc())
        if offset is not None:
            q = q.offset(offset)
        if limit is not None:
            q = q.limit(limit)
        return q.all()

    def prune_expired(self, ttl_seconds: int = 86400) -> int:
        now = time.time()
        try:
            del_count = self.session.query(PaymentSessionModel).filter(
                PaymentSessionModel.status != "captured",
                PaymentSessionModel.created_at < (now - ttl_seconds)
            ).delete()
            self.session.commit()
            return del_count
        except Exception:
            self.session.rollback()
            return 0

    def create_or_update(
        self,
        order_id: str,
        amount: float,
        currency: str = "INR",
        metadata: Optional[dict] = None
    ) -> PaymentSessionModel:
        now = time.time()
        meta_str = json.dumps(metadata or {})
        existing = self.get_by_order_id(order_id)
        if existing:
            existing.amount = round(amount, 2)
            existing.currency = currency
            existing.status = "created"
            existing.created_at = now
            existing.metadata_json = meta_str
            return existing
        else:
            rec = PaymentSessionModel(
                order_id=order_id,
                amount=round(amount, 2),
                currency=currency,
                status="created",
                created_at=now,
                metadata_json=meta_str
            )
            self.session.add(rec)
            return rec

    def save(self, entity: PaymentSessionModel) -> PaymentSessionModel:
        self.session.add(entity)
        return entity

    def delete(self, entity: PaymentSessionModel) -> bool:
        if entity:
            self.session.delete(entity)
            return True
        return False

    def count(self) -> int:
        return self.session.query(PaymentSessionModel).count()

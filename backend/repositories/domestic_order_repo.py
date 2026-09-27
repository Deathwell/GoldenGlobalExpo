"""
Golden Global Expo — Domestic Order Repository
Encapsulates all persistence logic and SQL queries for Indian domestic trade orders.
"""
from typing import Optional, List
from sqlalchemy import func
from backend.db import DomesticOrderModel
from backend.repositories.base import BaseRepository

class DomesticOrderRepository(BaseRepository[DomesticOrderModel]):
    def __init__(self, session):
        super().__init__(session)

    def get_by_id(self, entity_id: str) -> Optional[DomesticOrderModel]:
        if not entity_id:
            return None
        clean_id = str(entity_id).strip()
        return self.session.query(DomesticOrderModel).filter(
            func.lower(DomesticOrderModel.id) == clean_id.lower()
        ).first()

    def find_all(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[DomesticOrderModel]:
        q = self.session.query(DomesticOrderModel).order_by(DomesticOrderModel.created_at.desc())
        if offset is not None:
            q = q.offset(offset)
        if limit is not None:
            q = q.limit(limit)
        return q.all()

    def find_orders(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> List[DomesticOrderModel]:
        query = self.session.query(DomesticOrderModel)
        if status:
            s_clean = status.strip().lower()
            if s_clean in ["paid", "pending", "failed", "captured"]:
                query = query.filter(DomesticOrderModel.payment_status.ilike(s_clean))
            else:
                query = query.filter(DomesticOrderModel.order_status.ilike(f"%{s_clean}%"))
        if search:
            q_clean = search.strip().lower()
            query = query.filter(
                (DomesticOrderModel.id.ilike(f"%{q_clean}%")) |
                (DomesticOrderModel.consignee_name.ilike(f"%{q_clean}%")) |
                (DomesticOrderModel.consignee_phone.ilike(f"%{q_clean}%")) |
                (DomesticOrderModel.commodity.ilike(f"%{q_clean}%")) |
                (DomesticOrderModel.upi_utr.ilike(f"%{q_clean}%")) |
                (DomesticOrderModel.tracking_number.ilike(f"%{q_clean}%"))
            )
        return query.order_by(DomesticOrderModel.created_at.desc()).limit(limit).all()

    def find_by_utr(self, utr: str) -> Optional[DomesticOrderModel]:
        if not utr:
            return None
        clean_utr = str(utr).strip()
        return self.session.query(DomesticOrderModel).filter(
            func.lower(DomesticOrderModel.upi_utr) == clean_utr.lower()
        ).first()

    def find_by_tracking_number(self, tracking_number: str) -> Optional[DomesticOrderModel]:
        if not tracking_number:
            return None
        clean_trk = str(tracking_number).strip()
        return self.session.query(DomesticOrderModel).filter(
            func.lower(DomesticOrderModel.tracking_number) == clean_trk.lower()
        ).first()

    def save(self, entity: DomesticOrderModel) -> DomesticOrderModel:
        self.session.add(entity)
        return entity

    def delete(self, entity: DomesticOrderModel) -> bool:
        if entity:
            self.session.delete(entity)
            return True
        return False

    def delete_by_id(self, entity_id: str) -> int:
        if not entity_id:
            return 0
        clean_id = str(entity_id).strip()
        return self.session.query(DomesticOrderModel).filter(
            func.lower(DomesticOrderModel.id) == clean_id.lower()
        ).delete(synchronize_session=False)

    def count(self) -> int:
        return self.session.query(DomesticOrderModel).count()

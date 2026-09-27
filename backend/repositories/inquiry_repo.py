"""
Golden Global Expo — Inquiry Repository
Encapsulates all persistence logic and SQL queries for commercial inquiries and RFQs.
"""
from typing import Optional, List
from sqlalchemy import func
from backend.db import InquiryModel
from backend.repositories.base import BaseRepository

class InquiryRepository(BaseRepository[InquiryModel]):
    def __init__(self, session):
        super().__init__(session)

    def get_by_id(self, entity_id: str) -> Optional[InquiryModel]:
        if not entity_id:
            return None
        clean_id = str(entity_id).strip()
        return self.session.query(InquiryModel).filter(
            func.lower(InquiryModel.id) == clean_id.lower()
        ).first()

    def find_all(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[InquiryModel]:
        q = self.session.query(InquiryModel).order_by(InquiryModel.created_at.desc())
        if offset is not None:
            q = q.offset(offset)
        if limit is not None:
            q = q.limit(limit)
        return q.all()

    def find_by_tracking_or_utr(self, code: str) -> Optional[InquiryModel]:
        if not code:
            return None
        clean_code = str(code).strip().lower()
        return self.session.query(InquiryModel).filter(
            (func.lower(InquiryModel.id) == clean_code) |
            (func.lower(InquiryModel.tracking_number) == clean_code) |
            (func.lower(InquiryModel.tax_invoice_ref) == clean_code) |
            (func.lower(InquiryModel.utr) == clean_code)
        ).first()

    def save(self, entity: InquiryModel) -> InquiryModel:
        self.session.add(entity)
        return entity

    def delete(self, entity: InquiryModel) -> bool:
        if entity:
            self.session.delete(entity)
            return True
        return False

    def delete_by_id(self, entity_id: str) -> int:
        if not entity_id:
            return 0
        clean_id = str(entity_id).strip()
        return self.session.query(InquiryModel).filter(
            func.lower(InquiryModel.id) == clean_id.lower()
        ).delete(synchronize_session=False)

    def count(self) -> int:
        return self.session.query(InquiryModel).count()

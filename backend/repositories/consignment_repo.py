"""
Golden Global Expo — Consignment Repository
Encapsulates all persistence logic and SQL queries for maritime & air export consignments.
"""
from typing import Optional, List
from sqlalchemy import func
from backend.db import ConsignmentModel
from backend.repositories.base import BaseRepository

class ConsignmentRepository(BaseRepository[ConsignmentModel]):
    def __init__(self, session):
        super().__init__(session)

    def get_by_id(self, entity_id: str) -> Optional[ConsignmentModel]:
        return self.get_by_bl(entity_id)

    def get_by_bl(self, bl: str) -> Optional[ConsignmentModel]:
        if not bl:
            return None
        clean_bl = str(bl).strip()
        return self.session.query(ConsignmentModel).filter(
            func.lower(ConsignmentModel.bl) == clean_bl.lower()
        ).first()

    def find_by_multi_ref(self, ref_code: str) -> Optional[ConsignmentModel]:
        """
        Search across all tracking references (BL, container, inquiry, quotation,
        customs documents, Phytosanitary, COA) using exact case-insensitive match
        to protect against SQL LIKE wildcard injections.
        """
        if not ref_code:
            return None
        clean_ref = str(ref_code).strip().lower()
        return self.session.query(ConsignmentModel).filter(
            (func.lower(ConsignmentModel.bl) == clean_ref) |
            (func.lower(ConsignmentModel.container) == clean_ref) |
            (func.lower(ConsignmentModel.inquiry_ref) == clean_ref) |
            (func.lower(ConsignmentModel.quotation_ref) == clean_ref) |
            (func.lower(ConsignmentModel.bl_ref) == clean_ref) |
            (func.lower(ConsignmentModel.inv_ref) == clean_ref) |
            (func.lower(ConsignmentModel.phyto_ref) == clean_ref) |
            (func.lower(ConsignmentModel.coa_ref) == clean_ref)
        ).first()

    def find_all(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[ConsignmentModel]:
        q = self.session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc())
        if offset is not None:
            q = q.offset(offset)
        if limit is not None:
            q = q.limit(limit)
        return q.all()

    def save(self, entity: ConsignmentModel) -> ConsignmentModel:
        self.session.add(entity)
        return entity

    def delete(self, entity: ConsignmentModel) -> bool:
        if entity:
            self.session.delete(entity)
            return True
        return False

    def delete_by_bl(self, bl: str) -> int:
        if not bl:
            return 0
        clean_bl = str(bl).strip()
        return self.session.query(ConsignmentModel).filter(
            (func.lower(ConsignmentModel.bl) == clean_bl.lower()) |
            (func.lower(ConsignmentModel.inquiry_ref) == clean_bl.lower())
        ).delete(synchronize_session=False)

    def count(self) -> int:
        return self.session.query(ConsignmentModel).count()

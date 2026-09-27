"""
Golden Global Expo — Consignment & Tracking Domain Service
Encapsulates maritime shipping, Bill of Lading (B/L) tracking telemetry,
stage progression, and Enterprise PII Privacy Shield protection (SRP & SoC).
"""
import os
import re
import time
from typing import Dict, Any, List, Optional
from sqlalchemy import func

from backend.db import ConsignmentModel, InquiryModel, DomesticOrderModel
from backend.repositories.consignment_repo import ConsignmentRepository
from backend.repositories.inquiry_repo import InquiryRepository
from backend.repositories.domestic_order_repo import DomesticOrderRepository
from backend.repositories.audit_repo import AuditRepository
from backend.services.event_dispatcher import get_event_publisher, ConsignmentUpdatedEvent, DomainEvent

class ConsignmentService:
    """Domain service managing maritime & air export consignments and tracking lookups."""

    @classmethod
    def list_consignments(cls, session) -> List[Dict[str, Any]]:
        repo = ConsignmentRepository(session)
        return [r.to_dict() for r in repo.find_all()]

    @classmethod
    def track(cls, bl_or_ref: str, is_authenticated: bool, session) -> Dict[str, Any]:
        """
        Unified tracking lookup across maritime consignments, domestic trade orders,
        and commercial RFQs with enterprise PII privacy shielding.
        """
        clean_code = str(bl_or_ref or "").strip()[:64]
        if not clean_code:
            raise ValueError("Missing B/L tracking number.")

        consign_repo = ConsignmentRepository(session)
        inq_repo = InquiryRepository(session)
        dom_repo = DomesticOrderRepository(session)

        record = consign_repo.find_by_multi_ref(clean_code)
        if record:
            if is_authenticated:
                return {'success': True, 'consignment': record.to_dict()}
            # Redact CRM references and customer PII for public tracking inquiries
            return {
                'success': True,
                'consignment': {
                    'bl': record.bl,
                    'commodity': record.commodity,
                    'vessel': record.vessel,
                    'pod': record.pod,
                    'eta': record.eta,
                    'container': record.container,
                    'stage': record.stage,
                    'status': record.status,
                    'invRef': record.inv_ref,
                    'phytoRef': record.phyto_ref,
                    'coaRef': record.coa_ref,
                    'blRef': record.bl_ref,
                    'updatedAt': record.updated_at
                }
            }

        # Check domestic trade orders
        inq = inq_repo.find_by_tracking_or_utr(clean_code)
        dom = dom_repo.get_by_id(clean_code) or dom_repo.find_by_utr(clean_code) or dom_repo.find_by_tracking_number(clean_code)

        if dom or (inq and (inq.type == 'DOMESTIC_ORDER' or inq.id.upper().startswith(('GGE-DOM-', 'DOM-')))) or clean_code.upper().startswith(('GGE-DOM-', 'DOM-', 'TAX-INV-DOM-', 'BD-DOM-')):
            dom_id = dom.id if dom else (inq.id if inq else clean_code.upper())
            dom_name = dom.consignee_name if dom else (inq.name if inq else "Domestic Consignee")
            dom_comm = dom.commodity if dom else (inq.commodities if inq else "Sortex Cleaned Agri Commodities")
            dom_vol = f"{dom.pack_size} × {dom.quantity}" if dom else (inq.volume if inq else "")
            dest_city = dom.city if dom else (inq.city if inq else "")
            dest_state = dom.state if dom else (inq.state if inq else "India")
            dest_pin = dom.pincode if dom else (inq.pincode if inq else "")
            dom_status = dom.order_status if dom else (inq.status if inq else "Order Placed · Payment Pending")
            courier = dom.courier_partner if dom else (inq.courier_partner if inq else "Blue Dart Express Surface")
            tracking_num = dom.tracking_number if dom else (inq.tracking_number if inq else "")

            # Enterprise PII Privacy Shield
            if not is_authenticated:
                dom_name = "Authorized Consignee"
                dest_display = f"{dest_city or 'Regional Hub'}, {dest_state}".strip(", ")
            else:
                dest_display = f"{dest_city}, {dest_state} {dest_pin}".strip(", ")

            return {
                'success': True,
                'type': 'DOMESTIC_ORDER',
                'isDomestic': True,
                'order': {
                    'id': dom_id,
                    'name': dom_name,
                    'commodity': dom_comm,
                    'volume': dom_vol,
                    'destination': dest_display,
                    'status': dom_status,
                    'courierPartner': courier,
                    'trackingNumber': tracking_num,
                    'message': 'This reference is an Indian domestic trade order. Surface express logistics and courier docket telemetry activate once UPI payment is verified and dispatch is scheduled from our Mumbai distribution hub.'
                }
            }

        # Check commercial export inquiries (RFQ)
        if inq or clean_code.upper().startswith(('RFQ-', 'GGE-RFQ-', 'RFQ')):
            inq_id = inq.id if inq else clean_code.upper()
            inq_name = inq.name if inq else "Prospective Commercial Buyer"
            inq_company = inq.company if inq else ""
            inq_comm = inq.commodities if inq else "Sortex Grade-A Agri Commodities"
            inq_vol = inq.volume if inq else ""
            inq_dest = inq.country if inq else ""

            if not is_authenticated:
                inq_name = "Authorized Commercial Buyer"
                inq_company = "Registered Trade Client"

            return {
                'success': True,
                'type': 'INQUIRY',
                'isInquiry': True,
                'inquiry': {
                    'id': inq_id,
                    'name': inq_name,
                    'company': inq_company,
                    'commodity': inq_comm,
                    'volume': inq_vol,
                    'destination': inq_dest,
                    'status': inq.status if inq else 'Inquiry Received · Under Review',
                    'message': 'This reference is a commercial export inquiry under trade desk review, not an active freight shipment. A maritime Bill of Lading (B/L) and vessel tracking telemetry are issued only once an export contract is finalized, container freight is booked, and cargo is laden aboard at Nhava Sheva (JNPT) Port.'
                }
            }

        raise KeyError(f"Consignment with B/L {clean_code} not found.")

    @classmethod
    def save_consignments(cls, items: List[Dict[str, Any]], session) -> Dict[str, Any]:
        valid_items = [item for item in items if isinstance(item, dict) and str(item.get('bl') or item.get('blCode', '')).strip()]
        if not valid_items:
            raise ValueError("Consignment requires a valid B/L tracking code.")

        repo = ConsignmentRepository(session)
        now = time.time()

        for item in valid_items:
            bl_val = str(item.get('bl') or item.get('blCode', '')).strip().upper()
            record = repo.get_by_bl(bl_val)

            try:
                stage_val = int(item.get('stage', 1))
            except (ValueError, TypeError):
                stage_val = 1
            stage_val = max(1, min(6, stage_val))

            if record:
                for field in ['inquiryRef', 'quotationRef', 'buyer', 'buyerEmail', 'buyerPhone', 'commodity', 'vessel', 'pod', 'eta', 'container', 'status', 'invRef', 'phytoRef', 'coaRef', 'blRef']:
                    col = {
                        'inquiryRef': 'inquiry_ref',
                        'quotationRef': 'quotation_ref',
                        'buyerEmail': 'buyer_email',
                        'buyerPhone': 'buyer_phone',
                        'invRef': 'inv_ref',
                        'phytoRef': 'phyto_ref',
                        'coaRef': 'coa_ref',
                        'blRef': 'bl_ref'
                    }.get(field, field)
                    if field in item and item[field] is not None:
                        setattr(record, col, item[field])
                if 'stage' in item and item['stage'] is not None:
                    record.stage = stage_val
                record.updated_at = now
            else:
                new_c = ConsignmentModel(
                    bl=bl_val,
                    inquiry_ref=item.get('inquiryRef', ''),
                    quotation_ref=item.get('quotationRef', ''),
                    buyer=item.get('buyer', ''),
                    buyer_email=item.get('buyerEmail', ''),
                    buyer_phone=item.get('buyerPhone', ''),
                    commodity=item.get('commodity', ''),
                    vessel=item.get('vessel', 'Pending Ocean Booking'),
                    pod=item.get('pod', ''),
                    eta=item.get('eta', 'Pending Ocean Schedule'),
                    container=item.get('container', 'PENDING ALLOCATION'),
                    stage=stage_val,
                    status=item.get('status', 'Stage 1: Mandi Sourced & Grading'),
                    inv_ref=item.get('invRef', ''),
                    phyto_ref=item.get('phytoRef', ''),
                    coa_ref=item.get('coaRef', ''),
                    bl_ref=item.get('blRef', ''),
                    updated_at=now
                )
                repo.save(new_c)

        session.commit()

        total = repo.count()
        get_event_publisher().publish(ConsignmentUpdatedEvent(
            data={"total": total, "timestamp": now}
        ), session=session)

        return {'success': True, 'message': 'Consignments updated in ACID database.', 'total': total}

    @classmethod
    def delete_consignment(cls, bl_code: str, session=None, operator: str = "Logistics Coordinator") -> Dict[str, Any]:
        if isinstance(session, str) and not hasattr(session, 'query'):
            operator, session = session, operator

        clean_bl = bl_code.strip().upper()
        if not clean_bl or len(clean_bl.replace('_', '')) == 0:
            raise ValueError("Invalid or empty B/L tracking code.")

        from backend.db import SessionLocal
        should_close = False
        if session is None:
            session = SessionLocal()
            should_close = True

        try:
            consign_repo = ConsignmentRepository(session)
            audit_repo = AuditRepository(session)

            existing = consign_repo.get_by_bl(clean_bl)
            prev_status = existing.status if existing and existing.status else "ACTIVE"
            prev_commodity = existing.commodity if existing and existing.commodity else "Cargo"

            consign_repo.delete_by_bl(clean_bl)
            session.commit()

            try:
                audit_repo.append_entry(
                    operator=operator or "Logistics Coordinator",
                    action="CONSIGNMENT_DELETED",
                    entity_id=clean_bl,
                    prev_state=prev_status,
                    new_state="DELETED",
                    details=f"Consignment {clean_bl} ({prev_commodity}) permanently deleted by administrator"
                )
                session.commit()
            except Exception as e:
                import logging
                logging.error(f"[DELETE CONSIGNMENT AUDIT ERROR] {e}", exc_info=True)

            from backend.core.config import BASE_DIR
            uploads_dir = os.path.join(str(BASE_DIR), "uploads", "documents")
            sanitized_bl = re.sub(r'[^A-Za-z0-9_-]', '_', clean_bl)
            if sanitized_bl and len(sanitized_bl.replace('_', '')) > 0 and os.path.exists(uploads_dir):
                for fname in os.listdir(uploads_dir):
                    if fname.startswith(f"{sanitized_bl}_"):
                        try:
                            os.remove(os.path.join(uploads_dir, fname))
                        except Exception:
                            pass

            total = consign_repo.count()
            get_event_publisher().publish(DomainEvent(
                event_name="CONSIGNMENT_DELETED",
                data={"total": total, "bl": clean_bl, "timestamp": time.time()},
                operator=operator,
                entity_id=clean_bl
            ), session=session)

            return {'success': True, 'message': f'Consignment {bl_code} deleted.'}
        finally:
            if should_close:
                session.close()


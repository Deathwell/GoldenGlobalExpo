"""
Golden Global Expo — Inquiry & RFQ Domain Service
Encapsulates commercial lead qualification, manifest volume validation (3.0-22.0 Quintals),
batch ingestion, domestic cross-sync, and cryptographic audit trail (SRP & SoC).
"""
import os
import re
import time
import secrets
from typing import Dict, Any, List, Optional
from sqlalchemy import func

from backend.db import InquiryModel, DomesticOrderModel, AuditLogModel, DATA_DIR
from backend.core.atomic_io import atomic_json_write
from backend.core.events import broadcast_sse
from backend.repositories.inquiry_repo import InquiryRepository
from backend.repositories.domestic_order_repo import DomesticOrderRepository
from backend.repositories.audit_repo import AuditRepository, compute_entry_hash
from backend.services.event_dispatcher import get_event_publisher, InquiryCreatedEvent, DomainEvent

class InquiryService:
    """Domain service managing commercial inquiries, RFQ tenders, and buyer manifests."""

    @classmethod
    def list_inquiries(cls, session) -> List[Dict[str, Any]]:
        repo = InquiryRepository(session)
        return [r.to_dict() for r in repo.find_all()]

    @classmethod
    def save_inquiries(cls, items_to_save: List[Dict[str, Any]], user: Optional[dict], session) -> Dict[str, Any]:
        max_batch = 50 if user else 5
        if len(items_to_save) > max_batch:
            raise ValueError(f"Batch limit exceeded: Maximum {max_batch} inquiries per submission.")

        if not user:
            has_valid_lead = any(
                isinstance(item, dict) and any(str(item.get(k, '')).strip() for k in ('name', 'email', 'phone', 'commodities', 'lotName'))
                for item in items_to_save
            )
            if not has_valid_lead:
                raise ValueError("Inquiry requires contact information or commodity selection.")

        # Validate manifest volume bounds (3.0 to 22.0 Quintals)
        for item in items_to_save:
            if item.get('manifest') and isinstance(item['manifest'], list) and len(item['manifest']) > 0:
                tot_qtl = 0.0
                for m in item['manifest']:
                    try:
                        q = float(m.get('quantity') or 0)
                        u = str(m.get('unit') or '').upper()
                        tot_qtl += (q / 100.0) if 'KG' in u else q
                    except (ValueError, TypeError):
                        pass
                if tot_qtl < 2.99 or tot_qtl > 22.01:
                    raise ValueError(f"Consignment volume out of bounds: Minimum order is 3.0 Quintals (300 KG) and maximum capacity is 22.0 Quintals. Current: {tot_qtl:.1f} Quintals.")

        repo = InquiryRepository(session)
        now = time.time()
        saved_count = 0

        for item in items_to_save:
            if not isinstance(item, dict):
                continue
            if not user and not any(str(item.get(k, '')).strip() for k in ('name', 'email', 'phone', 'commodities', 'lotName')):
                continue

            raw_id = str(item.get('id') or '').strip()
            clean_id = re.sub(r'[^A-Za-z0-9_-]', '', raw_id).upper()
            iid = clean_id[:64] if clean_id else f"RFQ-{secrets.token_hex(4).upper()}"

            record = repo.get_by_id(iid)
            if record and not user:
                # Anonymous visitors cannot modify existing RFQs
                iid = f"RFQ-{secrets.token_hex(4).upper()}"
                record = None

            clean_name = str(item.get('name') or '')[:128]
            clean_company = str(item.get('company') or '')[:128]
            clean_email = str(item.get('email') or '')[:128]
            clean_phone = str(item.get('phone') or '')[:64]
            clean_country = str(item.get('country') or '')[:128]
            clean_address = str(item.get('address') or '')[:500]
            clean_commodities = str(item.get('commodities') or item.get('commodity') or item.get('lotName', ''))[:256]
            clean_volume = str(item.get('volume') or item.get('quantity', ''))[:128]
            clean_incoterms = str(item.get('incoterms') or 'CIF')[:64]
            clean_payable = str(item.get('payable') or '')[:64]
            clean_status = str(item.get('status') or ('New RFQ' if user else 'Inquiry Received · Under Review'))[:64]
            clean_bl = str(item.get('blCode') or item.get('bl_code') or '')[:64]
            clean_pack = str(item.get('packSize') or item.get('pack_size') or '')[:32]
            try:
                clean_qty = int(item.get('quantity') or item.get('packQuantity') or 1)
            except (ValueError, TypeError):
                clean_qty = 1
            clean_qty = max(1, min(1000, clean_qty))
            clean_utr = str(item.get('utr') or item.get('upiUtr') or item.get('upi_utr') or '')[:64]
            clean_pay_status = str(item.get('paymentStatus') or item.get('payment_status') or '')[:32]
            clean_city = str(item.get('city') or '')[:128]
            clean_state = str(item.get('state') or '')[:128]
            clean_pin = str(item.get('pincode') or '')[:32]
            clean_inv_ref = str(item.get('taxInvoiceRef') or item.get('tax_invoice_ref') or '')[:64]
            clean_courier = str(item.get('courierPartner') or item.get('courier_partner') or '')[:64]
            clean_tracking = str(item.get('trackingNumber') or item.get('tracking_number') or '')[:64]

            if record:
                if 'name' in item: record.name = clean_name
                if 'company' in item: record.company = clean_company
                if 'email' in item: record.email = clean_email
                if 'phone' in item: record.phone = clean_phone
                if 'country' in item: record.country = clean_country
                if 'address' in item: record.address = clean_address
                if 'commodities' in item or 'lotName' in item: record.commodities = clean_commodities
                if 'volume' in item: record.volume = clean_volume
                if 'incoterms' in item: record.incoterms = clean_incoterms
                if 'payable' in item: record.payable = clean_payable
                if 'status' in item: record.status = clean_status
                if 'blCode' in item: record.bl_code = clean_bl
                if clean_pack: record.pack_size = clean_pack
                if 'quantity' in item or 'packQuantity' in item: record.pack_quantity = clean_qty
                if clean_utr: record.utr = clean_utr
                if clean_pay_status: record.payment_status = clean_pay_status
                if clean_city: record.city = clean_city
                if clean_state: record.state = clean_state
                if clean_pin: record.pincode = clean_pin
                if clean_inv_ref: record.tax_invoice_ref = clean_inv_ref
                if clean_courier: record.courier_partner = clean_courier
                if clean_tracking: record.tracking_number = clean_tracking
            else:
                try:
                    c_time = float(item.get('createdAt') or item.get('created_at') or now)
                except (ValueError, TypeError):
                    c_time = now
                new_inq = InquiryModel(
                    id=iid,
                    type=str(item.get('type', 'BULK_INQUIRY'))[:32],
                    name=clean_name,
                    company=clean_company,
                    email=clean_email,
                    phone=clean_phone,
                    country=clean_country,
                    address=clean_address,
                    commodities=clean_commodities,
                    volume=clean_volume,
                    incoterms=clean_incoterms,
                    payable=clean_payable,
                    status=clean_status,
                    bl_code=clean_bl,
                    date=str(item.get('date', time.strftime('%Y-%m-%d')))[:64],
                    created_at=c_time,
                    pack_size=clean_pack,
                    pack_quantity=clean_qty,
                    utr=clean_utr,
                    payment_status=clean_pay_status,
                    city=clean_city,
                    state=clean_state,
                    pincode=clean_pin,
                    tax_invoice_ref=clean_inv_ref,
                    courier_partner=clean_courier,
                    tracking_number=clean_tracking
                )
                repo.save(new_inq)

            # Bridge to DomesticOrderModel if it's a domestic order
            inq_type = str(item.get('type', '')).upper()
            is_dom = inq_type == 'DOMESTIC_ORDER' or iid.startswith(('GGE-DOM-', 'DOM-'))
            if is_dom:
                dom_rec = session.query(DomesticOrderModel).filter_by(id=iid).first()
                amt = 160.0
                if 'amount' in item:
                    try: amt = float(item['amount'])
                    except Exception: pass
                elif item.get('payable'):
                    m = re.search(r'₹([0-9.,]+)', str(item['payable']))
                    if m:
                        try: amt = float(m.group(1).replace(',', ''))
                        except Exception: pass

                if not dom_rec:
                    session.add(DomesticOrderModel(
                        id=iid,
                        commodity=clean_commodities or 'Classic Toor (Tur Dal)',
                        pack_size=clean_pack or '1kg',
                        quantity=clean_qty,
                        amount=amt,
                        consignee_name=clean_name,
                        consignee_phone=clean_phone,
                        consignee_email=clean_email,
                        delivery_address=clean_address,
                        city=clean_city,
                        state=clean_state or 'Maharashtra',
                        pincode=clean_pin,
                        upi_utr=clean_utr,
                        payment_status=clean_pay_status or ('PAID' if clean_utr else 'PENDING'),
                        order_status=clean_status or 'Payment Received · Hub Allocation',
                        tax_invoice_ref=clean_inv_ref or f"TAX-INV-{iid}",
                        courier_partner=clean_courier or 'Blue Dart Express Surface',
                        tracking_number=clean_tracking,
                        created_at=now if not record else record.created_at,
                        updated_at=now
                    ))
                else:
                    if clean_commodities: dom_rec.commodity = clean_commodities
                    if clean_pack: dom_rec.pack_size = clean_pack
                    if 'quantity' in item or 'packQuantity' in item: dom_rec.quantity = clean_qty
                    if amt > 0: dom_rec.amount = amt
                    if clean_name: dom_rec.consignee_name = clean_name
                    if clean_phone: dom_rec.consignee_phone = clean_phone
                    if clean_email: dom_rec.consignee_email = clean_email
                    if clean_address: dom_rec.delivery_address = clean_address
                    if clean_city: dom_rec.city = clean_city
                    if clean_state: dom_rec.state = clean_state
                    if clean_pin: dom_rec.pincode = clean_pin
                    if clean_utr: dom_rec.upi_utr = clean_utr
                    if clean_pay_status: dom_rec.payment_status = clean_pay_status
                    if clean_status: dom_rec.order_status = clean_status
                    if clean_inv_ref: dom_rec.tax_invoice_ref = clean_inv_ref
                    if clean_courier: dom_rec.courier_partner = clean_courier
                    if clean_tracking: dom_rec.tracking_number = clean_tracking
                    dom_rec.updated_at = now

            # Append to cryptographic audit ledger
            try:
                last_rec = session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).first()
                prev_h = last_rec.hash if last_rec and last_rec.hash else ("0" * 64)

                if is_dom:
                    audit_action = "DOMESTIC_ORDER_REGISTERED" if not record else "DOMESTIC_ORDER_UPDATED"
                    audit_details = (
                        f"Domestic order received: {clean_commodities} ({clean_pack} × {clean_qty} Units) for {clean_name} ({clean_city}, {clean_state})"
                        if not record else f"Domestic order {iid} updated to '{clean_status}'"
                    )
                else:
                    audit_action = "COMMERCIAL_RFQ_REGISTERED" if not record else "COMMERCIAL_RFQ_UPDATED"
                    dest_info = f" ({clean_country})" if clean_country else ""
                    audit_details = (
                        f"RFQ received: {clean_commodities} ({clean_volume}) from {clean_company or clean_name}{dest_info}"
                        if not record else f"RFQ {iid} updated to '{clean_status}'"
                    )

                audit_item = {
                    "id": f"AUD-{secrets.token_hex(4).upper()}",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "operator": clean_email or (user.get("email") if user else "Trade Storefront RFQ"),
                    "action": audit_action,
                    "entityId": iid,
                    "previousState": "NONE" if not record else (record.status or "OPEN"),
                    "newState": clean_status,
                    "details": audit_details
                }
                h = compute_entry_hash(audit_item, prev_h)
                session.add(AuditLogModel(
                    id=audit_item["id"],
                    timestamp=audit_item["timestamp"],
                    operator=audit_item["operator"],
                    action=audit_item["action"],
                    entity_id=audit_item["entityId"],
                    previous_state=audit_item["previousState"],
                    new_state=audit_item["newState"],
                    details=audit_item["details"],
                    prev_hash=prev_h,
                    hash=h
                ))
            except Exception:
                pass

            saved_count += 1

        session.commit()

        # Update JSON mirrors
        all_inqs = [r.to_dict() for r in session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()]
        try:
            atomic_json_write(os.path.join(DATA_DIR, 'inquiries.json'), all_inqs)
            dom_orders = [r.to_dict() for r in session.query(DomesticOrderModel).order_by(DomesticOrderModel.created_at.desc()).all()]
            atomic_json_write(os.path.join(DATA_DIR, 'domestic_orders.json'), dom_orders)
        except Exception:
            pass

        broadcast_sse("NEW_INQUIRY", {"total": len(all_inqs), "timestamp": now})
        return {'success': True, 'message': 'Inquiries updated in ACID database.', 'total': len(all_inqs)}

    @classmethod
    def delete_inquiry(cls, inquiry_id: str, session=None, operator: str = "Trade Desk Admin") -> Dict[str, Any]:
        if isinstance(session, str) and not hasattr(session, 'query'):
            operator, session = session, operator

        clean_iid = re.sub(r'[^A-Za-z0-9_-]', '', str(inquiry_id).strip())[:64]
        if not clean_iid:
            raise ValueError("Inquiry ID is required.")

        from backend.db import SessionLocal
        should_close = False
        if session is None:
            session = SessionLocal()
            should_close = True

        try:
            inq_repo = InquiryRepository(session)
            dom_repo = DomesticOrderRepository(session)
            audit_repo = AuditRepository(session)

            existing_inq = inq_repo.get_by_id(clean_iid)
            existing_dom = dom_repo.get_by_id(clean_iid)
            prev_state = (existing_inq.status if existing_inq and existing_inq.status else (existing_dom.order_status if existing_dom and existing_dom.order_status else "ACTIVE"))
            is_dom = bool(existing_dom or clean_iid.upper().startswith("GGE-DOM"))

            inq_repo.delete_by_id(clean_iid)
            dom_repo.delete_by_id(clean_iid)
            session.commit()

            try:
                audit_repo.append_entry(
                    operator=operator or "Trade Desk Admin",
                    action="DOMESTIC_ORDER_DELETED" if is_dom else "COMMERCIAL_RFQ_DELETED",
                    entity_id=clean_iid,
                    prev_state=prev_state,
                    new_state="DELETED",
                    details=f"{'Domestic order' if is_dom else 'Commercial inquiry'} {clean_iid} deleted by administrator"
                )
                session.commit()
            except Exception as e:
                import logging
                logging.error(f"[DELETE INQUIRY AUDIT ERROR] {e}", exc_info=True)

            all_inqs = [r.to_dict() for r in session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()]
            try:
                atomic_json_write(os.path.join(DATA_DIR, 'inquiries.json'), all_inqs)
                dom_orders = [r.to_dict() for r in session.query(DomesticOrderModel).order_by(DomesticOrderModel.created_at.desc()).all()]
                atomic_json_write(os.path.join(DATA_DIR, 'domestic_orders.json'), dom_orders)
            except Exception:
                pass

            broadcast_sse("NEW_INQUIRY", {"total": len(all_inqs), "timestamp": time.time()})
            if is_dom:
                broadcast_sse("DOMESTIC_ORDER_UPDATED", {"orderId": clean_iid, "status": "DELETED", "timestamp": time.time()})

            return {'success': True, 'message': f'Inquiry {inquiry_id} deleted.'}
        finally:
            if should_close:
                session.close()


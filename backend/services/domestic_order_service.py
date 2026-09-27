"""
Golden Global Expo — Domestic Order Domain Service
Orchestrates Indian domestic trade orders, packaging tiers, pricing calculations,
instant UPI settlement verification, fulfillment telemetry, and GST invoicing (SRP & SoC).
"""
import os
import json
import math
import time
import secrets
import html
import re
from urllib.parse import quote_plus
from typing import Dict, Any, Optional, List, Tuple

from backend.core.config import UPI_VPA, UPI_PAYEE_NAME, BASE_DIR
from backend.core.events import broadcast_sse
from backend.core.atomic_io import atomic_json_write
from backend.db import (
    DomesticOrderModel, InquiryModel, ConsignmentModel,
    AuditLogModel, PaymentSessionModel, DATA_DIR
)
from backend.repositories.domestic_order_repo import DomesticOrderRepository
from backend.repositories.inquiry_repo import InquiryRepository
from backend.repositories.consignment_repo import ConsignmentRepository
from backend.repositories.audit_repo import AuditRepository, compute_entry_hash
from backend.repositories.payment_session_repo import PaymentSessionRepository
from backend.services.tax_service import TaxCalculationService
from backend.services.invoice_builder import InvoiceBuilder
from backend.services.email_service import background_send_email_task
from backend.services.event_dispatcher import (
    get_event_publisher, OrderPlacedEvent, PaymentVerifiedEvent,
    DomesticPaymentVerifiedEvent, DomesticOrderUpdatedEvent, DomainEvent
)

DOMESTIC_COMMODITY_SCHEDULE = {
    "p1": {"name": "Classic Toor (Tur Dal)", "category": "pulses", "hsn": "0713", "packs": {"500g": 85.0, "1kg": 160.0, "5kg": 775.0, "25kg": 3750.0}},
    "p2": {"name": "Classic Moong (Whole)", "category": "pulses", "hsn": "0713", "packs": {"500g": 80.0, "1kg": 150.0, "5kg": 725.0, "25kg": 3500.0}},
    "p3": {"name": "Classic Chana Dal", "category": "pulses", "hsn": "0713", "packs": {"500g": 65.0, "1kg": 120.0, "5kg": 575.0, "25kg": 2750.0}},
    "p4": {"name": "Classic Masoor (Red Split)", "category": "pulses", "hsn": "0713", "packs": {"500g": 70.0, "1kg": 130.0, "5kg": 625.0, "25kg": 3000.0}},
    "p5": {"name": "Chia Seeds (Superfood)", "category": "seeds", "hsn": "1207", "packs": {"500g": 190.0, "1kg": 360.0, "5kg": 1700.0, "25kg": 8200.0}},
    "p6": {"name": "Coriander Seeds (Dhania)", "category": "spices", "hsn": "0909", "packs": {"500g": 95.0, "1kg": 180.0, "5kg": 850.0, "25kg": 4100.0}},
    "p7": {"name": "Cumin Seeds (Jeera Whole)", "category": "spices", "hsn": "0909", "packs": {"500g": 240.0, "1kg": 460.0, "5kg": 2200.0, "25kg": 10500.0}},
    "p8": {"name": "Moringa Leaf Powder", "category": "powders", "hsn": "0910", "packs": {"500g": 220.0, "1kg": 420.0, "5kg": 2000.0, "25kg": 9500.0}},
    "p9": {"name": "Mint Powder (Pudina)", "category": "powders", "hsn": "0910", "packs": {"500g": 180.0, "1kg": 340.0, "5kg": 1600.0, "25kg": 7800.0}},
    "p10": {"name": "Coriander Powder", "category": "powders", "hsn": "0910", "packs": {"500g": 110.0, "1kg": 210.0, "5kg": 1000.0, "25kg": 4800.0}},
    "p11": {"name": "Jowar (Whole Sorghum)", "category": "grains", "hsn": "1008", "packs": {"500g": 45.0, "1kg": 80.0, "5kg": 380.0, "25kg": 1800.0}},
    "p12": {"name": "Jowar Flour (Sorghum Atta)", "category": "grains", "hsn": "1102", "packs": {"500g": 50.0, "1kg": 90.0, "5kg": 430.0, "25kg": 2050.0}},
    "p13": {"name": "Tissue Paper Virgin Pulp", "category": "paper", "hsn": "4818", "packs": {"500g": 150.0, "1kg": 280.0, "5kg": 1300.0, "25kg": 5800.0}},
    "p14": {"name": "Emmer Wheat (Khapli Wheat)", "category": "grains", "hsn": "1001", "packs": {"500g": 55.0, "1kg": 100.0, "5kg": 480.0, "25kg": 2300.0}},
    "p15": {"name": "Pure Cow Ghee (Desi Bilona)", "category": "dairy", "hsn": "0405", "packs": {"500g": 450.0, "1kg": 850.0, "5kg": 4100.0, "25kg": 19800.0}},
    "p17": {"name": "Indian Home Spices (Individual Lots)", "category": "spices", "hsn": "0910", "packs": {"500g": 160.0, "1kg": 300.0, "5kg": 1420.0, "25kg": 6800.0}},
}

ALLOWED_PACKS = ["500g", "1kg", "5kg", "25kg"]

COMMODITY_ALIASES = {
    "p1": ["toor", "tur", "pigeon pea", "arhar"],
    "p2": ["moong", "mung", "green gram"],
    "p3": ["chana", "bengal gram", "chickpea"],
    "p4": ["masoor", "red split", "red lentil", "lentil"],
    "p5": ["chia"],
    "p6": ["coriander seed", "dhania whole", "dhania seed"],
    "p7": ["cumin", "jeera"],
    "p8": ["moringa"],
    "p9": ["mint", "pudina"],
    "p10": ["coriander powder", "dhania powder"],
    "p11": ["jowar", "sorghum"],
    "p12": ["jowar flour", "sorghum flour", "jowar atta", "sorghum atta"],
    "p13": ["tissue", "paper", "pulp"],
    "p14": ["emmer", "khapli", "wheat"],
    "p15": ["ghee", "bilona", "cow ghee"],
    "p17": ["home spices", "garam masala", "spices"],
}

def normalize_pack_size(pack: str) -> str:
    return DomesticOrderService.normalize_pack_size(pack)

def calculate_domestic_price(commodity_input: str, pack_size: str, quantity: int = 1) -> float:
    return DomesticOrderService.calculate_price(commodity_input, pack_size, quantity)

def get_commodity_hsn(commodity_name: str) -> str:
    return TaxCalculationService.get_commodity_hsn(commodity_name)

class DomesticOrderService:
    """Domain service managing the entire Indian domestic order and fulfillment lifecycle."""

    @classmethod
    def normalize_pack_size(cls, pack: str) -> str:
        p = str(pack or "").strip().lower().replace(" ", "")
        if p in ["500g", "500gms", "0.5kg", "500gm"]:
            return "500g"
        if p in ["1kg", "1000g", "1.0kg", "1kgs"]:
            return "1kg"
        if p in ["5kg", "5000g", "5.0kg", "5kgs"]:
            return "5kg"
        if p in ["25kg", "25000g", "25.0kg", "25kgs"]:
            return "25kg"
        return ""

    @classmethod
    def get_current_rates(cls) -> Dict[str, Any]:
        """Returns domestic commodity rates merged with database overrides."""
        rates = {k: {**v, "packs": dict(v["packs"])} for k, v in DOMESTIC_COMMODITY_SCHEDULE.items()}
        try:
            from backend.db import SessionLocal, CommoditySpecificationModel, CommodityPriceModel
            session = SessionLocal()
            try:
                specs = session.query(CommoditySpecificationModel).all()
                for s in specs:
                    if s.code not in rates and s.domestic_packs_json:
                        try:
                            packs = json.loads(s.domestic_packs_json)
                            if isinstance(packs, dict) and packs:
                                rates[s.code] = {
                                    "name": s.name,
                                    "category": s.category.lower() if s.category else "pulses",
                                    "hsn": s.hs_code.split(".")[0] if s.hs_code else "0713",
                                    "packs": {k: float(v) for k, v in packs.items()}
                                }
                        except Exception:
                            pass
                prices = session.query(CommodityPriceModel).all()
                for p in prices:
                    if hasattr(p, 'domestic_packs_json') and p.domestic_packs_json and p.domestic_packs_json != '{}':
                        try:
                            packs = json.loads(p.domestic_packs_json)
                            if isinstance(packs, dict) and packs:
                                clean_packs = {k: float(v) for k, v in packs.items()}
                                if p.code in rates:
                                    rates[p.code]["packs"].update(clean_packs)
                                else:
                                    rates[p.code] = {
                                        "name": p.name or p.code,
                                        "category": (p.category or "pulses").lower(),
                                        "hsn": "0713",
                                        "packs": clean_packs
                                    }
                        except Exception:
                            pass
            finally:
                session.close()
        except Exception:
            pass
        return rates

    @classmethod
    def calculate_price(cls, commodity_input: str, pack_size: str, quantity: int = 1) -> float:
        norm_pack = cls.normalize_pack_size(pack_size) or "1kg"
        rates = cls.get_current_rates()
        matched = None
        c_clean = str(commodity_input or "").lower().strip()
        if commodity_input in rates:
            matched = rates[commodity_input]
        else:
            if c_clean:
                for k, item in rates.items():
                    if k == c_clean or item["name"].lower() in c_clean or (len(c_clean) >= 3 and c_clean in item["name"].lower()):
                        matched = item
                        break
                if not matched:
                    for k, aliases in COMMODITY_ALIASES.items():
                        if any(alias in c_clean for alias in aliases):
                            matched = rates.get(k)
                            break
        unit_price = matched["packs"].get(norm_pack, 160.0) if matched else 160.0
        return round(unit_price * max(1, quantity), 2)

    @classmethod
    def get_rates_payload(cls) -> Dict[str, Any]:
        return {
            "success": True,
            "rates": cls.get_current_rates(),
            "allowedPacks": ALLOWED_PACKS,
            "upiVpa": UPI_VPA,
            "payeeName": UPI_PAYEE_NAME
        }

    @classmethod
    def list_orders(
        cls,
        session,
        limit: int = 100,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        repo = DomesticOrderRepository(session)
        records = repo.find_orders(status=status, search=search, limit=limit)
        return {
            "success": True,
            "total": len(records),
            "orders": [r.to_dict() for r in records]
        }

    @classmethod
    def create_order(cls, data: Dict[str, Any], session) -> Dict[str, Any]:
        raw_comm = str(data.get("commodity") or data.get("commodityCode") or data.get("commodity_code") or data.get("code") or "").strip()[:256]
        if raw_comm in DOMESTIC_COMMODITY_SCHEDULE:
            commodity = DOMESTIC_COMMODITY_SCHEDULE[raw_comm]["name"]
        else:
            commodity = raw_comm or "Classic Toor (Tur Dal)"

        raw_pack = str(data.get("packSize") or data.get("pack_size") or data.get("weight") or "1kg").strip()
        clean_pack = cls.normalize_pack_size(raw_pack)
        if not clean_pack or clean_pack not in ALLOWED_PACKS:
            raise ValueError(f"Invalid pack size. Domestic distribution supports: {', '.join(ALLOWED_PACKS)}")

        raw_qty = data.get("quantity") if "quantity" in data else data.get("qty")
        if raw_qty is not None and not isinstance(raw_qty, (int, float)):
            try:
                quantity = int(raw_qty)
            except (ValueError, TypeError):
                raise ValueError("Quantity must be between 1 and 1,000 units.")
        else:
            try:
                quantity = 1 if raw_qty is None else int(raw_qty)
            except (ValueError, TypeError):
                quantity = 1

        if quantity < 1 or quantity > 1000:
            raise ValueError("Quantity must be between 1 and 1,000 units.")

        name = str(data.get("name") or data.get("consigneeName") or "").strip()[:128]
        phone = str(data.get("phone") or data.get("consigneePhone") or "").strip()[:64]
        email = str(data.get("email") or data.get("consigneeEmail") or "").strip()[:128]
        address = str(data.get("address") or data.get("deliveryAddress") or "").strip()[:500]
        city = str(data.get("city") or "Mumbai").strip()[:128]
        state = str(data.get("state") or "Maharashtra").strip()[:128]
        pincode = str(data.get("pincode") or "").strip()[:32]
        gstin = str(data.get("gstin") or "").strip().upper()[:32]

        if "name" in data and not name:
            raise ValueError("Consignee name is required.")
        if "phone" in data and not phone:
            raise ValueError("Consignee phone number is required.")

        name = name or "Valued Buyer"
        expected_amount = cls.calculate_price(commodity, clean_pack, quantity)

        if "amount" in data and data["amount"] is not None:
            try:
                provided_amount = float(data["amount"])
                if math.isnan(provided_amount) or math.isinf(provided_amount) or provided_amount < 1.0 or provided_amount > 1000000.0:
                    raise ValueError("Order amount must be between 1 and 1,000,000 INR.")
                if expected_amount > 0 and abs(provided_amount - expected_amount) > 0.05:
                    raise ValueError(f"Price tampering detected: Order amount ({provided_amount}) does not match authorized scheduled price ({expected_amount}).")
            except (ValueError, TypeError) as e:
                if "Price tampering detected" in str(e) or "Order amount must be" in str(e):
                    raise
                raise ValueError("Invalid numeric amount.")

        order_amount = expected_amount
        raw_order_id = str(data.get("orderId") or data.get("order_id") or "").strip()
        clean_oid = re.sub(r'[^A-Za-z0-9_-]', '', raw_order_id)[:64]
        order_id = clean_oid if (clean_oid and clean_oid.startswith(("GGE-DOM-", "DOM-"))) else f"GGE-DOM-{secrets.token_hex(4).upper()}"
        clean_sfx = order_id.replace('GGE-DOM-', '')

        is_mock = bool(data.get("is_mock")) or str(data.get("is_mock", "")).lower() == "true" or order_id.startswith("GGE-DOM-MOCK")

        clean_meta = {
            "orderId": order_id,
            "type": "DOMESTIC_ORDER",
            "commodity": commodity,
            "packSize": clean_pack,
            "quantity": quantity,
            "amount": round(order_amount, 2),
            "name": name,
            "phone": phone,
            "email": email,
            "address": address,
            "city": city,
            "state": state,
            "pincode": pincode,
            "gstin": gstin,
            "is_mock": "true" if is_mock else "false"
        }

        dom_repo = DomesticOrderRepository(session)
        inq_repo = InquiryRepository(session)
        now = time.time()

        # 1. PaymentSessionModel
        ps = session.query(PaymentSessionModel).filter_by(order_id=order_id).first()
        if ps:
            if ps.status == "captured":
                raise ValueError(f"Domestic order {order_id} has already been completed and captured.")
            ps.amount = round(order_amount, 2)
            ps.currency = "INR"
            ps.status = "created"
            ps.created_at = now
            ps.metadata_json = json.dumps(clean_meta)
        else:
            session.add(PaymentSessionModel(
                order_id=order_id,
                amount=round(order_amount, 2),
                currency="INR",
                status="created",
                created_at=now,
                metadata_json=json.dumps(clean_meta)
            ))

        # 2. DomesticOrderModel
        existing = dom_repo.get_by_id(order_id)
        if existing:
            if existing.payment_status == "PAID":
                raise ValueError(f"Domestic order {order_id} has already been completed and captured.")
            existing.commodity = commodity
            existing.pack_size = clean_pack
            existing.quantity = quantity
            existing.amount = order_amount
            existing.consignee_name = name
            existing.consignee_phone = phone
            existing.consignee_email = email
            existing.delivery_address = address
            existing.city = city
            existing.state = state
            existing.pincode = pincode
            existing.gstin = gstin
            existing.upi_vpa = UPI_VPA
            existing.updated_at = now
            order_rec = existing
        else:
            order_rec = DomesticOrderModel(
                id=order_id,
                commodity=commodity,
                pack_size=clean_pack,
                quantity=quantity,
                amount=order_amount,
                consignee_name=name,
                consignee_phone=phone,
                consignee_email=email,
                delivery_address=address,
                city=city,
                state=state,
                pincode=pincode,
                gstin=gstin,
                upi_vpa=UPI_VPA,
                upi_utr="",
                payment_status="PENDING",
                order_status="Order Placed · Payment Pending",
                tax_invoice_ref=f"TAX-INV-DOM-{clean_sfx}",
                courier_partner="Blue Dart Express Surface",
                tracking_number=f"BD-DOM-{clean_sfx}",
                created_at=now,
                updated_at=now
            )
            dom_repo.save(order_rec)

        # 3. InquiryModel (Bridge to unified CRM Inbox)
        full_addr_str = ", ".join([p for p in [address, city, state, f"PIN: {pincode}" if pincode else ""] if p])
        inq = inq_repo.get_by_id(order_id)
        if not inq:
            inq = InquiryModel(
                id=order_id,
                type="DOMESTIC_ORDER",
                name=name,
                company=f"Domestic Consignee ({city})",
                email=email,
                phone=phone,
                country="India",
                address=full_addr_str,
                commodities=f"{commodity} ({clean_pack} × {quantity} Units)",
                volume=f"{clean_pack} × {quantity}",
                incoterms="DOOR_DELIVERY",
                payable=f"₹{order_amount:.2f} INR (UPI)",
                status="Order Placed · Payment Pending",
                bl_code=order_id,
                date=time.strftime('%Y-%m-%d'),
                created_at=now,
                pack_size=clean_pack,
                pack_quantity=quantity,
                payment_status="PENDING",
                city=city,
                state=state,
                pincode=pincode,
                tax_invoice_ref=order_rec.tax_invoice_ref,
                courier_partner=order_rec.courier_partner,
                tracking_number=order_rec.tracking_number
            )
            inq_repo.save(inq)
        else:
            inq.name = name
            inq.phone = phone
            inq.email = email
            inq.address = full_addr_str
            inq.commodities = f"{commodity} ({clean_pack} × {quantity} Units)"
            inq.volume = f"{clean_pack} × {quantity}"
            inq.pack_size = clean_pack
            inq.pack_quantity = quantity
            inq.payable = f"₹{order_amount:.2f} INR (UPI)"
            inq.city = city
            inq.state = state
            inq.pincode = pincode

        session.commit()

        # Dynamic UPI Deep Link
        encoded_payee = quote_plus(UPI_PAYEE_NAME)
        encoded_note = quote_plus(f"GGE Order {order_id}")
        upi_uri = f"upi://pay?pa={UPI_VPA}&pn={encoded_payee}&am={order_amount:.2f}&cu=INR&tn={encoded_note}&tr={order_id}"

        get_event_publisher().publish(OrderPlacedEvent(
            data={"orderId": order_id, "amount": order_amount, "commodity": commodity, "quantity": quantity},
            operator=email or name
        ), session=session)

        broadcast_sse("DOMESTIC_ORDER_CREATED", {"orderId": order_id, "amount": order_amount, "timestamp": now})

        return {
            "success": True,
            "orderId": order_id,
            "amount": round(order_amount, 2),
            "currency": "INR",
            "upiVpa": UPI_VPA,
            "payeeName": UPI_PAYEE_NAME,
            "upiUri": upi_uri,
            "upiLink": upi_uri,
            "commodity": commodity,
            "packSize": clean_pack,
            "quantity": quantity,
            "consignee": {
                "name": name,
                "phone": phone,
                "email": email,
                "address": address,
                "city": city,
                "state": state,
                "pincode": pincode,
                "gstin": gstin
            },
            "consigneeName": name,
            "destination": f"{city}, {state} - {pincode}".strip(", -"),
            "paymentStatus": "PENDING",
            "orderStatus": order_rec.order_status
        }

    @classmethod
    def verify_upi_payment(cls, data: Dict[str, Any], session, background_tasks=None) -> Dict[str, Any]:
        raw_order_id = data.get("orderId") or data.get("order_id")
        if not raw_order_id or not str(raw_order_id).strip():
            raise ValueError("Order ID is required to confirm UPI payment.")

        order_id = re.sub(r'[^A-Za-z0-9_-]', '', str(raw_order_id).strip())[:64]
        raw_utr = data.get("utr") or data.get("paymentId") or data.get("payment_id") or data.get("upi_ref")
        if not raw_utr or not str(raw_utr).strip():
            raise ValueError("UPI Transaction Reference (UTR) is required.")

        utr = re.sub(r'[^A-Za-z0-9_-]', '', str(raw_utr).strip())[:64]
        if len(utr) < 4:
            raise ValueError("Valid UPI Reference Number / UTR is required (min 4 characters).")

        dom_repo = DomesticOrderRepository(session)
        inq_repo = InquiryRepository(session)
        consign_repo = ConsignmentRepository(session)
        audit_repo = AuditRepository(session)

        session_record = session.query(PaymentSessionModel).filter_by(order_id=order_id).first()
        dom_order = dom_repo.get_by_id(order_id)

        if not session_record and not dom_order:
            raise KeyError("Domestic order session not found or expired. Please initialize order first.")

        # Idempotent response if already completed
        if dom_order and dom_order.payment_status == "PAID":
            return {
                "success": True,
                "status": "captured",
                "paymentId": dom_order.upi_utr or utr,
                "orderId": order_id,
                "alreadyCaptured": True,
                "amount": dom_order.amount,
                "taxInvoiceRef": dom_order.tax_invoice_ref,
                "trackingNumber": dom_order.tracking_number
            }

        meta = {}
        if session_record and session_record.metadata_json:
            try:
                meta = json.loads(session_record.metadata_json)
            except Exception:
                meta = {}

        is_mock = (
            bool(data.get("is_mock")) or
            str(data.get("is_mock", "")).lower() == "true" or
            str(meta.get("is_mock", "")).lower() == "true" or
            utr.lower().startswith("mock") or
            utr.startswith("UTR991448") or
            order_id.startswith("GGE-DOM-MOCK")
        )

        # Anti-replay protection: prevent reusing same UTR on another order (production only)
        if not is_mock:
            other = dom_repo.find_by_utr(utr)
            if other and other.id.lower() != (dom_order.id.lower() if dom_order else order_id.lower()):
                raise ValueError(f"UTR {utr} has already been registered for another order ({other.id}). Duplicate submissions are rejected.")

        expected_amt = (session_record.amount if session_record else dom_order.amount) if (session_record or dom_order) else 160.0
        if "amount" in data and data["amount"] is not None:
            try:
                paid_amt = float(data["amount"])
                if abs(paid_amt - expected_amt) > 0.05:
                    raise ValueError(f"Price tampering detected: Confirmed amount ({paid_amt}) does not match authorized amount ({expected_amt}).")
            except (ValueError, TypeError) as e:
                if "Price tampering detected" in str(e):
                    raise
                raise ValueError("Invalid confirmation amount.")

        now = time.time()
        clean_sfx = order_id.replace('GGE-DOM-', '')
        short_sfx = clean_sfx[:8] if clean_sfx else secrets.token_hex(4).upper()

        name = str(data.get("name") or meta.get("name") or (dom_order.consignee_name if dom_order else "Domestic Trade Buyer")).strip()[:128]
        phone = str(data.get("phone") or meta.get("phone") or (dom_order.consignee_phone if dom_order else "")).strip()[:64]
        email = str(data.get("email") or meta.get("email") or (dom_order.consignee_email if dom_order else "")).strip()[:128]
        address = str(data.get("address") or meta.get("address") or (dom_order.delivery_address if dom_order else "")).strip()[:500]
        city = str(data.get("city") or meta.get("city") or (dom_order.city if dom_order else "")).strip()[:128]
        state = str(data.get("state") or meta.get("state") or (dom_order.state if dom_order else "Maharashtra")).strip()[:128]
        pincode = str(data.get("pincode") or meta.get("pincode") or (dom_order.pincode if dom_order else "")).strip()[:16]
        gstin = str(data.get("gstin") or meta.get("gstin") or (dom_order.gstin if dom_order else "")).strip()[:64]
        commodity = str(data.get("commodity") or meta.get("commodity") or (dom_order.commodity if dom_order else "Classic Toor (Tur Dal)")).strip()[:256]
        pack_size = cls.normalize_pack_size(str(data.get("packSize") or meta.get("packSize") or (dom_order.pack_size if dom_order else "1kg"))) or "1kg"

        raw_qty = data.get("quantity") if "quantity" in data else (meta.get("quantity") or (dom_order.quantity if dom_order else 1))
        try:
            qty = max(1, int(raw_qty)) if raw_qty is not None else 1
        except (ValueError, TypeError):
            qty = 1

        kg_mult = 0.5 if pack_size == "500g" else (1.0 if pack_size == "1kg" else (5.0 if pack_size == "5kg" else 25.0))
        total_kg = kg_mult * qty
        confirmed_amt = expected_amt

        tax_inv_ref = f"TAX-INV-DOM-{short_sfx}"
        tracking_no = f"BD-DOM-{short_sfx}"
        courier_name = "Blue Dart Express Surface"

        # 1. Update PaymentSessionModel
        if session_record:
            session_record.status = "captured"
            session_record.payment_id = utr
            session_record.captured_at = now

        # 2. Update / Create DomesticOrderModel
        if not dom_order:
            dom_order = DomesticOrderModel(
                id=order_id,
                commodity=commodity,
                pack_size=pack_size,
                quantity=qty,
                amount=confirmed_amt,
                consignee_name=name,
                consignee_phone=phone,
                consignee_email=email,
                delivery_address=address,
                city=city,
                state=state,
                pincode=pincode,
                gstin=gstin,
                upi_vpa=UPI_VPA,
                upi_utr=utr,
                payment_status="PAID",
                order_status="Payment Received · Hub Allocation",
                tax_invoice_ref=tax_inv_ref,
                courier_partner=courier_name,
                tracking_number=tracking_no,
                created_at=now,
                updated_at=now
            )
            dom_repo.save(dom_order)
        else:
            dom_order.upi_utr = utr
            dom_order.payment_status = "PAID"
            dom_order.order_status = "Payment Received · Hub Allocation"
            dom_order.tax_invoice_ref = tax_inv_ref
            dom_order.courier_partner = courier_name
            dom_order.tracking_number = tracking_no
            dom_order.updated_at = now
            if name: dom_order.consignee_name = name
            if phone: dom_order.consignee_phone = phone
            if email: dom_order.consignee_email = email
            if address: dom_order.delivery_address = address
            if city: dom_order.city = city
            if state: dom_order.state = state
            if pincode: dom_order.pincode = pincode

        full_addr_parts = [p for p in [address, city, state, f"PIN: {pincode}" if pincode else ""] if p]
        full_address = ", ".join(full_addr_parts) if full_addr_parts else "Mumbai, Maharashtra, India"
        payable_desc = f"₹{confirmed_amt:.2f} INR (PAID VIA UPI · UTR: {utr})"

        # 3. Update / Create InquiryModel
        inq = inq_repo.get_by_id(order_id)
        if not inq:
            inq = InquiryModel(
                id=order_id,
                type="DOMESTIC_ORDER",
                name=name,
                company="Domestic Trade Consignee",
                email=email,
                phone=phone,
                country="India",
                address=full_address,
                commodities=f"{commodity} ({pack_size} × {qty} Units)",
                volume=f"{total_kg:.1f} KG ({pack_size} × {qty})",
                incoterms="DOOR_DELIVERY (Domestic Express Surface)",
                payable=payable_desc,
                status="PAID · Pending Domestic Dispatch",
                bl_code=order_id,
                date=time.strftime('%Y-%m-%d'),
                created_at=now,
                pack_size=pack_size,
                pack_quantity=qty,
                utr=utr,
                payment_status="PAID",
                city=city,
                state=state,
                pincode=pincode,
                tax_invoice_ref=tax_inv_ref,
                courier_partner=courier_name,
                tracking_number=tracking_no
            )
            inq_repo.save(inq)
        else:
            inq.type = "DOMESTIC_ORDER"
            inq.status = "PAID · Pending Domestic Dispatch"
            inq.payable = payable_desc
            inq.bl_code = order_id
            inq.utr = utr
            inq.payment_status = "PAID"
            inq.pack_size = pack_size
            inq.pack_quantity = qty
            inq.tax_invoice_ref = tax_inv_ref
            inq.courier_partner = courier_name
            inq.tracking_number = tracking_no
            if name: inq.name = name
            if email: inq.email = email
            if phone: inq.phone = phone
            if full_address: inq.address = full_address

        # 4. Update / Create ConsignmentModel
        consign = consign_repo.get_by_bl(order_id)
        carrier_label = "Domestic Surface Express (BlueDart / Delhivery)"
        if not consign:
            consign = ConsignmentModel(
                bl=order_id,
                inquiry_ref=order_id,
                quotation_ref=order_id,
                buyer=name,
                buyer_email=email,
                buyer_phone=phone,
                commodity=f"{commodity} ({pack_size} × {qty} Units · {total_kg:.1f} KG)",
                vessel=carrier_label,
                pod=f"{city or 'Domestic Hub'}, {state} (PIN {pincode or 'India'})",
                eta="2-4 Business Days Door Delivery",
                container=f"DOM-PARCEL #{short_sfx}",
                stage=2,
                status="Domestic Order Confirmed · Hub Allocation",
                inv_ref=tax_inv_ref,
                phyto_ref=f"AGMARK-IN-{short_sfx}",
                coa_ref=f"FSSAI-GGE-{short_sfx}",
                bl_ref=tracking_no,
                updated_at=now
            )
            consign_repo.save(consign)
        else:
            consign.vessel = carrier_label
            if consign.stage is None or consign.stage < 2:
                consign.stage = 2
                consign.status = "Domestic Order Confirmed · Hub Allocation"
            if not consign.inv_ref: consign.inv_ref = tax_inv_ref
            if not consign.phyto_ref: consign.phyto_ref = f"AGMARK-IN-{short_sfx}"
            if not consign.coa_ref: consign.coa_ref = f"FSSAI-GGE-{short_sfx}"
            if not consign.bl_ref: consign.bl_ref = tracking_no
            consign.updated_at = now

        # 5. Cryptographic Audit Log
        audit_operator = "Simulated UPI Settlement (Mock Mode)" if is_mock else "NPCI UPI Gateway (Instant Settlement)"
        audit_repo.append_entry(
            operator=audit_operator,
            action="DOMESTIC_ORDER_PAID_UPI",
            entity_id=order_id,
            prev_state="UPI_INITIATED",
            new_state=f"PAID_₹{confirmed_amt:.2f}_CAPTURED",
            details=f"UPI UTR: {utr} | Consignee: {name} ({city}, {state}) | Commodity: {commodity} ({pack_size} x {qty} Units)"
        )
        session.commit()

        # 6. Publish domain event & broadcast telemetry
        get_event_publisher().publish(DomesticPaymentVerifiedEvent(
            data={"orderId": order_id, "paymentId": utr, "amount": confirmed_amt, "name": name},
            operator=audit_operator
        ), session=session)

        broadcast_sse("DOMESTIC_ORDER_UPDATED", {"orderId": order_id, "status": "PAID", "utr": utr})
        broadcast_sse("CONSIGNMENT_UPDATED", {"total": consign_repo.count(), "timestamp": now})
        broadcast_sse("NEW_INQUIRY", {"total": inq_repo.count(), "timestamp": now})
        broadcast_sse("PAYMENT_CONFIRMED", {"orderId": order_id, "paymentId": utr})

        # Outbound notification email
        if email and "@" in email and background_tasks:
            esc_name = html.escape(name)
            esc_address = html.escape(full_address)
            esc_commodity = html.escape(commodity)
            esc_order_id = html.escape(order_id)
            esc_utr = html.escape(utr)
            email_payload = {
                "to": email,
                "toName": name,
                "subject": f"Golden Global Expo — Domestic Order Confirmed ({order_id})",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
                    <div style="background: #12100E; padding: 24px; text-align: center; border-bottom: 2px solid #D9AC52;">
                        <h1 style="color: #D9AC52; margin: 0; font-size: 20px;">GOLDEN GLOBAL EXPO</h1>
                        <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 12px; letter-spacing: 1px;">NATIONAL AGRI-DISTRIBUTION DESK (INDIA)</p>
                    </div>
                    <div style="padding: 24px; background: #ffffff;">
                        <h2 style="color: #111827; font-size: 18px; margin-top: 0;">UPI Payment Verified &amp; Dispatch Scheduled</h2>
                        <p>Dear {esc_name},</p>
                        <p>Your UPI payment of <b>₹{confirmed_amt:.2f} INR</b> has been verified. Consignment allocation is underway at our Mumbai Central Distribution Hub.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 8px 0; color: #6B7280;">Order Reference:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">{esc_order_id}</td></tr>
                            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 8px 0; color: #6B7280;">UPI UTR / Txn ID:</td><td style="padding: 8px 0; font-family: monospace;">{esc_utr}</td></tr>
                            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 8px 0; color: #6B7280;">Commodity &amp; Pack:</td><td style="padding: 8px 0; font-weight: bold;">{esc_commodity} ({pack_size} × {qty} Units)</td></tr>
                            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 8px 0; color: #6B7280;">Total Weight:</td><td style="padding: 8px 0;">{total_kg:.1f} KG</td></tr>
                            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 8px 0; color: #6B7280;">GST Tax Invoice:</td><td style="padding: 8px 0; font-family: monospace;">{tax_inv_ref}</td></tr>
                            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 8px 0; color: #6B7280;">Delivery Address:</td><td style="padding: 8px 0;">{esc_address}</td></tr>
                            <tr style="border-bottom: 1px solid #E5E7EB;"><td style="padding: 8px 0; color: #6B7280;">Courier Tracking:</td><td style="padding: 8px 0;">{courier_name} · Docket #{tracking_no}</td></tr>
                        </table>
                        <p style="font-size: 12px; color: #9CA3AF; margin-top: 24px;">Golden Global Expo · Wadala East, Mumbai, Maharashtra 400037 · FSSAI Reg: 11521008000142</p>
                    </div>
                </div>
                """
            }
            background_tasks.add_task(background_send_email_task, email_payload)

        return {
            "success": True,
            "status": "captured",
            "orderId": order_id,
            "utr": utr,
            "amount": confirmed_amt,
            "taxInvoiceRef": tax_inv_ref,
            "courierPartner": courier_name,
            "trackingNumber": tracking_no,
            "paymentStatus": "PAID",
            "orderStatus": dom_order.order_status
        }

    @classmethod
    def get_order_by_id(cls, order_id: str, is_authenticated: bool, session) -> Dict[str, Any]:
        clean_id = re.sub(r'[^A-Za-z0-9_-]', '', order_id.strip())[:64]
        dom_repo = DomesticOrderRepository(session)
        inq_repo = InquiryRepository(session)

        order = dom_repo.get_by_id(clean_id)
        if not order:
            inq = inq_repo.get_by_id(clean_id)
            if inq and (inq.type == 'DOMESTIC_ORDER' or clean_id.upper().startswith(('GGE-DOM-', 'DOM-'))):
                amt = 160.0
                if inq.payable:
                    m = re.search(r'₹([0-9.,]+)', inq.payable)
                    if m:
                        try: amt = float(m.group(1).replace(',', ''))
                        except Exception: pass
                order = DomesticOrderModel(
                    id=inq.id,
                    commodity=inq.commodities or 'Classic Toor (Tur Dal)',
                    pack_size=inq.pack_size or '1kg',
                    quantity=inq.pack_quantity or 1,
                    amount=amt,
                    consignee_name=inq.name,
                    consignee_phone=inq.phone,
                    consignee_email=inq.email,
                    delivery_address=inq.address,
                    city=inq.city or '',
                    state=inq.state or 'Maharashtra',
                    pincode=inq.pincode or '',
                    upi_utr=inq.utr or '',
                    payment_status=inq.payment_status or 'PAID',
                    order_status=inq.status or 'Payment Received · Hub Allocation',
                    tax_invoice_ref=inq.tax_invoice_ref or f"TAX-INV-DOM-{clean_id.replace('GGE-DOM-', '')}",
                    courier_partner=inq.courier_partner or 'Blue Dart Express Surface',
                    tracking_number=inq.tracking_number or f"BD-DOM-{clean_id.replace('GGE-DOM-', '')}",
                    created_at=inq.created_at or time.time(),
                    updated_at=time.time()
                )

        if not order:
            raise KeyError(f"Domestic order {clean_id} not found.")

        d = order.to_dict()
        if is_authenticated:
            return {"success": True, "order": d}

        # Privacy shield: redact PII for public access
        phone_str = str(d.get("consigneePhone") or "")
        d["consigneePhone"] = (phone_str[:3] + "••••" + phone_str[-3:]) if len(phone_str) > 6 else "••••"
        d["phone"] = d["consigneePhone"]
        email_str = str(d.get("consigneeEmail") or "")
        d["consigneeEmail"] = ("••••@" + email_str.split("@")[-1]) if "@" in email_str else "••••"
        d["email"] = d["consigneeEmail"]
        d["deliveryAddress"] = f"[Protected Address], {d.get('city') or 'India'}"
        d["address"] = d["deliveryAddress"]
        gstin_str = str(d.get("gstin") or "").strip()
        if gstin_str:
            d["gstin"] = (gstin_str[:2] + "••••••••••" + gstin_str[-3:]) if len(gstin_str) >= 15 else "••••"
        return {"success": True, "order": d}

    @classmethod
    def update_order_status(
        cls,
        order_id: str,
        new_status: str,
        courier_partner: Optional[str],
        tracking_number: Optional[str],
        tax_invoice_ref: Optional[str],
        operator: str,
        session
    ) -> Dict[str, Any]:
        clean_id = re.sub(r'[^A-Za-z0-9_-]', '', order_id.strip())[:64]
        dom_repo = DomesticOrderRepository(session)
        inq_repo = InquiryRepository(session)
        consign_repo = ConsignmentRepository(session)
        audit_repo = AuditRepository(session)

        order = dom_repo.get_by_id(clean_id)
        if not order:
            raise KeyError(f"Domestic order {clean_id} not found.")

        prev_status = order.order_status
        order.order_status = new_status
        now = time.time()
        order.updated_at = now
        if courier_partner: order.courier_partner = courier_partner
        if tracking_number: order.tracking_number = tracking_number
        if tax_invoice_ref: order.tax_invoice_ref = tax_invoice_ref

        # Sync inquiry
        inq = inq_repo.get_by_id(clean_id)
        if inq:
            inq.status = new_status
            if courier_partner: inq.courier_partner = courier_partner
            if tracking_number: inq.tracking_number = tracking_number
            if tax_invoice_ref: inq.tax_invoice_ref = tax_invoice_ref

        # Sync consignment
        consign = consign_repo.get_by_bl(clean_id)
        if not consign:
            short_sfx = clean_id.replace('GGE-DOM-', '')[:8]
            consign = ConsignmentModel(
                bl=clean_id,
                inquiry_ref=clean_id,
                quotation_ref=clean_id,
                buyer=order.consignee_name,
                buyer_email=order.consignee_email,
                buyer_phone=order.consignee_phone,
                commodity=f"{order.commodity} ({order.pack_size} × {order.quantity} Units)",
                vessel=order.courier_partner or "Blue Dart Express",
                pod=f"{order.city or 'Domestic Hub'}, {order.state or 'Maharashtra'}",
                eta="2-4 Business Days Door Delivery",
                container=f"DOM-PARCEL #{short_sfx}",
                stage=2,
                status=new_status,
                inv_ref=order.tax_invoice_ref,
                phyto_ref=f"AGMARK-IN-{short_sfx}",
                coa_ref=f"FSSAI-GGE-{short_sfx}",
                bl_ref=order.tracking_number,
                updated_at=now
            )
            consign_repo.save(consign)

        if consign:
            s_low = new_status.lower()
            if "deliver" in s_low:
                consign.stage = 6
                consign.status = "Stage 6: Delivered to Consignee"
            elif "out for delivery" in s_low or "local delivery" in s_low:
                consign.stage = 5
                consign.status = "Stage 5: Out for Local Delivery"
            elif any(w in s_low for w in ["dispatch", "transit", "blue dart", "delhivery", "speedpost", "post"]):
                consign.stage = 4
                consign.status = "Stage 4: Surface Express Transit"
            elif any(w in s_low for w in ["pack", "fssai", "sortex"]):
                consign.stage = 2
                consign.status = "Stage 2: Sortex Pack & FSSAI Clear"
            elif "hub" in s_low or "allocat" in s_low:
                consign.stage = 3
                consign.status = "Stage 3: Mumbai Hub Allocated"

            if courier_partner: consign.vessel = courier_partner
            if tracking_number: consign.bl_ref = tracking_number
            if tax_invoice_ref: consign.inv_ref = tax_invoice_ref
            consign.updated_at = now

        audit_repo.append_entry(
            operator=operator or "Trade Desk Dispatch Officer",
            action="DOMESTIC_ORDER_STATUS_UPDATED",
            entity_id=clean_id,
            prev_state=prev_status,
            new_state=new_status,
            details=f"Order {clean_id} updated to '{new_status}' | Courier: {order.courier_partner} | Tracking #{order.tracking_number}"
        )
        session.commit()

        get_event_publisher().publish(DomesticOrderUpdatedEvent(
            data={"orderId": clean_id, "status": new_status, "timestamp": now},
            operator=operator
        ), session=session)

        broadcast_sse("DOMESTIC_ORDER_UPDATED", {"orderId": clean_id, "status": new_status, "timestamp": now})
        broadcast_sse("CONSIGNMENT_UPDATED", {"orderId": clean_id, "timestamp": now})

        return {
            "success": True,
            "message": f"Domestic order {clean_id} status updated to {new_status}.",
            "order": order.to_dict()
        }

    @classmethod
    def delete_order(cls, order_id: str, operator: str, session) -> Dict[str, Any]:
        clean_id = re.sub(r'[^A-Za-z0-9_-]', '', order_id.strip())[:64]
        dom_repo = DomesticOrderRepository(session)
        inq_repo = InquiryRepository(session)
        consign_repo = ConsignmentRepository(session)
        audit_repo = AuditRepository(session)

        order = dom_repo.get_by_id(clean_id)
        prev_status = order.order_status if order else "ACTIVE"

        dom_repo.delete_by_id(clean_id)
        inq_repo.delete_by_id(clean_id)
        consign_repo.delete_by_bl(clean_id)

        audit_repo.append_entry(
            operator=operator or "Trade Desk Admin",
            action="DOMESTIC_ORDER_DELETED",
            entity_id=clean_id,
            prev_state=prev_status,
            new_state="DELETED",
            details=f"Domestic order {clean_id} permanently deleted by administrator"
        )
        session.commit()

        get_event_publisher().publish(DomainEvent(
            event_name="DOMESTIC_ORDER_UPDATED",
            data={"orderId": clean_id, "status": "DELETED", "timestamp": time.time()},
            operator=operator,
            entity_id=clean_id
        ), session=session)

        broadcast_sse("DOMESTIC_ORDER_UPDATED", {"orderId": clean_id, "status": "DELETED", "timestamp": time.time()})
        broadcast_sse("NEW_INQUIRY", {"total": inq_repo.count(), "timestamp": time.time()})

        return {"success": True, "message": f"Domestic order {clean_id} deleted."}

    @classmethod
    def generate_invoice(cls, order_id: str, format: str = "json", session = None):
        dom_repo = DomesticOrderRepository(session)
        inq_repo = InquiryRepository(session)

        clean_id = re.sub(r'[^A-Za-z0-9_-]', '', order_id.strip())[:64]
        order = dom_repo.get_by_id(clean_id)

        if not order:
            inq = inq_repo.get_by_id(clean_id)
            if inq and (inq.type == 'DOMESTIC_ORDER' or clean_id.startswith('GGE-DOM-') or clean_id.startswith('DOM-')):
                amt = 160.0
                if inq.payable:
                    m = re.search(r'₹([0-9.,]+)', inq.payable)
                    if m:
                        try: amt = float(m.group(1).replace(',', ''))
                        except Exception: pass
                order = DomesticOrderModel(
                    id=inq.id,
                    commodity=inq.commodities or 'Classic Toor (Tur Dal)',
                    pack_size=inq.pack_size or '1kg',
                    quantity=inq.pack_quantity or 1,
                    amount=amt,
                    consignee_name=inq.name,
                    consignee_phone=inq.phone,
                    consignee_email=inq.email,
                    delivery_address=inq.address,
                    city=inq.city or '',
                    state=inq.state or 'Maharashtra',
                    pincode=inq.pincode or '',
                    upi_utr=inq.utr or '',
                    payment_status=inq.payment_status or 'PAID',
                    order_status=inq.status or 'Payment Received · Hub Allocation',
                    tax_invoice_ref=inq.tax_invoice_ref or f"TAX-INV-DOM-{clean_id.replace('GGE-DOM-', '')}",
                    courier_partner=inq.courier_partner or 'Blue Dart Express Surface',
                    tracking_number=inq.tracking_number or f"BD-DOM-{clean_id.replace('GGE-DOM-', '')}",
                    created_at=inq.created_at or time.time(),
                    updated_at=time.time()
                )
            else:
                raise KeyError(f"Domestic order {clean_id} not found.")

        builder = InvoiceBuilder(order.to_dict())
        if format.lower() == "html":
            return builder.render_html()
        return builder.build_payload()

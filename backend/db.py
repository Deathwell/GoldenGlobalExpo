import os
import json
import time
from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Text, event, Index
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

import sys
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
DATA_DIR = os.environ.get('DATA_DIR', os.path.join(BASE_DIR, 'data'))
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, 'enterprise.db')
DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{DB_PATH}')

# Engine with connection pooling (PostgreSQL) and SQLite WAL mode
is_postgres = DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgres")
engine_kwargs = {"pool_pre_ping": True}
if "sqlite" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}
elif is_postgres:
    engine_kwargs["pool_size"] = int(os.environ.get("DB_POOL_SIZE", 10))
    engine_kwargs["max_overflow"] = int(os.environ.get("DB_MAX_OVERFLOW", 20))
    engine_kwargs["pool_recycle"] = int(os.environ.get("DB_POOL_RECYCLE", 1800))

engine = create_engine(DATABASE_URL, **engine_kwargs)

# Enable SQLite Write-Ahead Logging (WAL) for high concurrency
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA busy_timeout=30000;")
        cursor.close()

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

# ================= 1. DATABASE MODELS =================

class InquiryModel(Base):
    __tablename__ = 'inquiries'

    id = Column(String(64), primary_key=True, index=True)
    type = Column(String(32), default='BULK_INQUIRY', index=True)
    name = Column(String(128), default='')
    company = Column(String(128), default='')
    email = Column(String(128), index=True, default='')
    phone = Column(String(64), default='')
    country = Column(String(128), default='')
    address = Column(Text, default='')
    commodities = Column(String(256), default='')
    volume = Column(String(128), default='')
    incoterms = Column(String(64), default='CIF')
    payable = Column(String(64), default='')
    status = Column(String(64), default='New RFQ', index=True)
    bl_code = Column(String(64), default='', index=True)
    date = Column(String(64), default='')
    created_at = Column(Float, default=time.time, index=True)

    # Domestic-specific attributes
    pack_size = Column(String(32), default='')
    pack_quantity = Column(Integer, default=1)
    utr = Column(String(64), default='', index=True)
    payment_status = Column(String(32), default='')
    city = Column(String(128), default='')
    state = Column(String(128), default='')
    pincode = Column(String(32), default='')
    tax_invoice_ref = Column(String(64), default='', index=True)
    courier_partner = Column(String(64), default='')
    tracking_number = Column(String(64), default='', index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'company': self.company,
            'email': self.email,
            'phone': self.phone,
            'country': self.country,
            'address': self.address,
            'commodities': self.commodities,
            'volume': self.volume,
            'incoterms': self.incoterms,
            'payable': self.payable,
            'status': self.status,
            'blCode': self.bl_code,
            'date': self.date,
            'createdAt': self.created_at,
            'packSize': self.pack_size or '',
            'pack_size': self.pack_size or '',
            'quantity': self.pack_quantity or 1,
            'packQuantity': self.pack_quantity or 1,
            'utr': self.utr or '',
            'paymentStatus': self.payment_status or '',
            'payment_status': self.payment_status or '',
            'city': self.city or '',
            'state': self.state or '',
            'pincode': self.pincode or '',
            'taxInvoiceRef': self.tax_invoice_ref or '',
            'courierPartner': self.courier_partner or '',
            'trackingNumber': self.tracking_number or ''
        }

class DomesticOrderModel(Base):
    __tablename__ = 'domestic_orders'

    id = Column(String(64), primary_key=True, index=True)
    commodity = Column(String(256), default='')
    pack_size = Column(String(32), default='1kg')
    quantity = Column(Integer, default=1)
    amount = Column(Float, default=0.0)
    consignee_name = Column(String(128), default='')
    consignee_phone = Column(String(64), default='')
    consignee_email = Column(String(128), default='')
    delivery_address = Column(Text, default='')
    city = Column(String(128), default='')
    state = Column(String(128), default='Maharashtra')
    pincode = Column(String(32), default='')
    gstin = Column(String(64), default='')
    upi_vpa = Column(String(128), default='')
    upi_utr = Column(String(64), index=True, default='')
    payment_status = Column(String(32), default='PENDING', index=True)
    order_status = Column(String(64), default='Order Placed · Payment Pending', index=True)
    tax_invoice_ref = Column(String(64), default='', index=True)
    courier_partner = Column(String(64), default='Blue Dart Express Surface')
    tracking_number = Column(String(64), default='', index=True)
    created_at = Column(Float, default=time.time, index=True)
    updated_at = Column(Float, default=time.time)

    def to_dict(self):
        return {
            'id': self.id,
            'orderId': self.id,
            'type': 'DOMESTIC_ORDER',
            'commodity': self.commodity,
            'packSize': self.pack_size,
            'pack_size': self.pack_size,
            'quantity': self.quantity,
            'qty': self.quantity,
            'amount': self.amount,
            'consigneeName': self.consignee_name,
            'name': self.consignee_name,
            'consigneePhone': self.consignee_phone,
            'phone': self.consignee_phone,
            'consigneeEmail': self.consignee_email,
            'email': self.consignee_email,
            'deliveryAddress': self.delivery_address,
            'address': self.delivery_address,
            'city': self.city,
            'state': self.state,
            'pincode': self.pincode,
            'gstin': self.gstin,
            'upiVpa': self.upi_vpa,
            'upiUtr': self.upi_utr,
            'utr': self.upi_utr,
            'paymentStatus': self.payment_status,
            'payment_status': self.payment_status,
            'orderStatus': self.order_status,
            'status': self.order_status,
            'taxInvoiceRef': self.tax_invoice_ref,
            'courierPartner': self.courier_partner,
            'trackingNumber': self.tracking_number,
            'tracking_number': self.tracking_number,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at
        }

class ConsignmentModel(Base):
    __tablename__ = 'consignments'

    bl = Column(String(64), primary_key=True, index=True)
    inquiry_ref = Column(String(64), index=True, default='')
    quotation_ref = Column(String(64), default='', index=True)
    buyer = Column(String(128), default='')
    buyer_email = Column(String(128), default='')
    buyer_phone = Column(String(64), default='')
    commodity = Column(String(256), default='')
    vessel = Column(String(128), default='Pending Ocean Booking')
    pod = Column(String(128), default='')
    eta = Column(String(64), default='Pending Ocean Schedule')
    container = Column(String(64), default='PENDING ALLOCATION', index=True)
    stage = Column(Integer, default=1, index=True)
    status = Column(String(128), default='Stage 1: Mandi Sourced & Grading')
    inv_ref = Column(String(128), default='')
    phyto_ref = Column(String(128), default='')
    coa_ref = Column(String(128), default='')
    bl_ref = Column(String(128), default='', index=True)
    updated_at = Column(Float, default=time.time, index=True)

    def to_dict(self):
        return {
            'bl': self.bl,
            'inquiryRef': self.inquiry_ref,
            'quotationRef': self.quotation_ref,
            'buyer': self.buyer,
            'buyerEmail': self.buyer_email,
            'buyerPhone': self.buyer_phone,
            'commodity': self.commodity,
            'vessel': self.vessel,
            'pod': self.pod,
            'eta': self.eta,
            'container': self.container,
            'stage': self.stage,
            'status': self.status,
            'invRef': self.inv_ref,
            'phytoRef': self.phyto_ref,
            'coaRef': self.coa_ref,
            'blRef': self.bl_ref,
            'updatedAt': self.updated_at
        }

class CommodityPriceModel(Base):
    __tablename__ = 'commodity_prices'

    code = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), default='')
    category = Column(String(64), default='Pulses')
    base_usd = Column(Float, default=0.0)
    price_inr = Column(Float, default=0.0)
    margin_pct = Column(Float, default=0.0)
    domestic_packs_json = Column(Text, default='{}')
    updated_at = Column(Float, default=time.time)

    def to_dict(self):
        val = self.base_usd if (self.base_usd is not None and self.base_usd > 0) else self.price_inr
        try:
            packs = json.loads(self.domestic_packs_json) if self.domestic_packs_json else {}
        except Exception:
            packs = {}
        return {
            'code': self.code,
            'name': self.name,
            'category': self.category,
            'baseUsd': val,
            'price': val,
            'marginPct': self.margin_pct,
            'domesticPacks': packs,
            'updatedAt': self.updated_at
        }

class CommoditySpecificationModel(Base):
    __tablename__ = 'commodity_specifications'

    code = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), default='')
    botanical = Column(String(128), default='')
    category = Column(String(64), default='Pulses')
    image = Column(String(256), default='')
    hs_code = Column(String(32), default='')
    origin = Column(String(128), default='Maharashtra / Karnataka (India)')
    crop = Column(String(128), default='2025/2026 Crop')
    harvest_season = Column(String(128), default='')
    purity = Column(String(64), default='99.5% Min')
    moisture = Column(String(64), default='11.0% Max')
    foreign_matter = Column(String(64), default='0.1% Max')
    protein = Column(String(64), default='')
    packing = Column(String(128), default='25kg / 50kg PP Woven Bags')
    loadability = Column(String(128), default="20' FCL Load: 24.0 MT")
    shelf_life = Column(String(64), default='24 Months')
    certifications = Column(String(256), default='APEDA, FSSAI Export, Phytosanitary, Non-GMO')
    base_usd = Column(Float, default=850.0)
    domestic_packs_json = Column(Text, default='{}')
    coa_url = Column(String(256), default='')
    is_active = Column(Integer, default=1)
    updated_at = Column(Float, default=time.time)

    def to_dict(self):
        try:
            packs = json.loads(self.domestic_packs_json) if self.domestic_packs_json else {}
        except Exception:
            packs = {}
        return {
            'code': self.code,
            'name': self.name,
            'botanical': self.botanical,
            'category': self.category,
            'image': self.image,
            'hsCode': self.hs_code,
            'hs': self.hs_code,
            'origin': self.origin,
            'crop': self.crop,
            'harvestSeason': self.harvest_season,
            'purity': self.purity,
            'moisture': self.moisture,
            'foreignMatter': self.foreign_matter,
            'protein': self.protein,
            'packing': self.packing,
            'loadability': self.loadability,
            'shelfLife': self.shelf_life,
            'certifications': self.certifications,
            'baseUsd': self.base_usd,
            'price': self.base_usd,
            'domesticPacks': packs,
            'coaUrl': self.coa_url,
            'isActive': bool(self.is_active),
            'updatedAt': self.updated_at
        }

class AuditLogModel(Base):
    __tablename__ = 'audit_logs'

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(String(64), default='', index=True)
    operator = Column(String(128), default='')
    action = Column(String(128), default='', index=True)
    entity_id = Column(String(128), default='', index=True)
    previous_state = Column(String(256), default='')
    new_state = Column(String(256), default='')
    details = Column(Text, default='')
    prev_hash = Column(String(64), default='')
    hash = Column(String(64), default='', index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'operator': self.operator,
            'action': self.action,
            'entityId': self.entity_id,
            'entity_id': self.entity_id,
            'previousState': self.previous_state,
            'previous_state': self.previous_state,
            'newState': self.new_state,
            'new_state': self.new_state,
            'details': self.details,
            'prevHash': self.prev_hash,
            'prev_hash': self.prev_hash,
            'hash': self.hash
        }

class AdminSessionModel(Base):
    __tablename__ = 'admin_sessions'

    token = Column(String(128), primary_key=True, index=True)
    email = Column(String(128), default='')
    role = Column(String(32), default='admin')
    created_at = Column(Float, default=time.time)
    expires_at = Column(Float, default=0.0)

class ActiveOtpModel(Base):
    __tablename__ = 'active_otps'

    email = Column(String(128), primary_key=True, index=True)
    code = Column(String(32), nullable=False)
    expires_at = Column(Float, nullable=False, index=True)
    attempts = Column(Integer, default=0)
    created_at = Column(Float, default=time.time)

    def to_dict(self):
        return {
            'email': self.email,
            'code': self.code,
            'expires_at': self.expires_at,
            'attempts': self.attempts,
            'created_at': self.created_at
        }

class RateLimitHitModel(Base):
    __tablename__ = 'rate_limit_hits'

    id = Column(Integer, primary_key=True, autoincrement=True)
    endpoint = Column(String(64), nullable=False, index=True)
    ip = Column(String(64), nullable=False, index=True)
    timestamp = Column(Float, nullable=False, index=True)

    __table_args__ = (
        Index('ix_rate_limit_hits_ep_ip_ts', 'endpoint', 'ip', 'timestamp'),
    )

class RateLimitLockModel(Base):
    __tablename__ = 'rate_limit_locks'

    ip = Column(String(64), primary_key=True, index=True)
    expires_at = Column(Float, nullable=False, index=True)

class PaymentSessionModel(Base):
    __tablename__ = 'payment_sessions'

    order_id = Column(String(64), primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(16), default='INR')
    status = Column(String(32), default='created')
    payment_id = Column(String(64), default='')
    created_at = Column(Float, default=time.time, index=True)
    captured_at = Column(Float, nullable=True)
    metadata_json = Column(Text, default='{}')

    def to_dict(self):
        try:
            meta = json.loads(self.metadata_json) if self.metadata_json else {}
        except Exception:
            meta = {}
        return {
            'orderId': self.order_id,
            'amount': self.amount,
            'currency': self.currency,
            'status': self.status,
            'paymentId': self.payment_id,
            'createdAt': self.created_at,
            'capturedAt': self.captured_at,
            'metadata': meta
        }

# ================= 2. INITIALIZATION & MIGRATION =================

def init_db():
    Base.metadata.create_all(bind=engine)
    if "sqlite" in str(engine.url):
        try:
            with engine.connect() as conn:
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(commodity_prices);")
                cols = [col[1] for col in cursor.fetchall()]
                if 'base_usd' not in cols:
                    cursor.execute("ALTER TABLE commodity_prices ADD COLUMN base_usd FLOAT DEFAULT 0.0;")
                    conn.connection.commit()
                if 'domestic_packs_json' not in cols:
                    cursor.execute("ALTER TABLE commodity_prices ADD COLUMN domestic_packs_json TEXT DEFAULT '{}';")
                    conn.connection.commit()

                # Sync domestic pack rates from commodity_specifications if available
                cursor.execute("PRAGMA table_info(admin_sessions);")
                s_cols = [col[1] for col in cursor.fetchall()]
                if 'role' not in s_cols:
                    cursor.execute("ALTER TABLE admin_sessions ADD COLUMN role VARCHAR(32) DEFAULT 'admin';")
                    conn.connection.commit()

                cursor.execute("PRAGMA table_info(inquiries);")
                inq_cols = [col[1] for col in cursor.fetchall()]
                new_inq_cols = {
                    'pack_size': "VARCHAR(32) DEFAULT ''",
                    'pack_quantity': "INTEGER DEFAULT 1",
                    'utr': "VARCHAR(64) DEFAULT ''",
                    'payment_status': "VARCHAR(32) DEFAULT ''",
                    'city': "VARCHAR(128) DEFAULT ''",
                    'state': "VARCHAR(128) DEFAULT ''",
                    'pincode': "VARCHAR(32) DEFAULT ''",
                    'tax_invoice_ref': "VARCHAR(64) DEFAULT ''",
                    'courier_partner': "VARCHAR(64) DEFAULT ''",
                    'tracking_number': "VARCHAR(64) DEFAULT ''"
                }
                for col_name, col_type in new_inq_cols.items():
                    if col_name not in inq_cols:
                        cursor.execute(f"ALTER TABLE inquiries ADD COLUMN {col_name} {col_type};")
                        conn.connection.commit()

                # Ensure performance indexes for lookups and joins
                index_sqls = [
                    "CREATE INDEX IF NOT EXISTS ix_inquiries_bl_code ON inquiries (bl_code);",
                    "CREATE INDEX IF NOT EXISTS ix_inquiries_utr ON inquiries (utr);",
                    "CREATE INDEX IF NOT EXISTS ix_inquiries_tax_invoice_ref ON inquiries (tax_invoice_ref);",
                    "CREATE INDEX IF NOT EXISTS ix_inquiries_tracking_number ON inquiries (tracking_number);",
                    "CREATE INDEX IF NOT EXISTS ix_domestic_orders_tax_invoice_ref ON domestic_orders (tax_invoice_ref);",
                    "CREATE INDEX IF NOT EXISTS ix_domestic_orders_tracking_number ON domestic_orders (tracking_number);",
                    "CREATE INDEX IF NOT EXISTS ix_consignments_container ON consignments (container);",
                    "CREATE INDEX IF NOT EXISTS ix_consignments_bl_ref ON consignments (bl_ref);",
                    "CREATE INDEX IF NOT EXISTS ix_consignments_quotation_ref ON consignments (quotation_ref);"
                ]
                for idx_sql in index_sqls:
                    try:
                        cursor.execute(idx_sql)
                    except Exception:
                        pass
                conn.connection.commit()

                cursor.close()
        except Exception as e:
            print(f"[DB MIGRATION] Column alter error: {e}")
    migrate_legacy_json_data()

def migrate_legacy_json_data():
    """Seamlessly migrates existing JSON flat files into the ACID database."""
    session = SessionLocal()
    try:
        # 1. Inquiries
        inq_file = os.path.join(DATA_DIR, 'inquiries.json')
        if os.path.exists(inq_file):
            try:
                with open(inq_file, 'r', encoding='utf-8') as f:
                    inqs = json.load(f)
                for item in inqs:
                    iid = item.get('id')
                    if iid and not session.query(InquiryModel).filter_by(id=iid).first():
                        session.add(InquiryModel(
                            id=iid,
                            type=item.get('type', 'BULK_INQUIRY'),
                            name=item.get('name', ''),
                            company=item.get('company', ''),
                            email=item.get('email', ''),
                            phone=item.get('phone', ''),
                            country=item.get('country', ''),
                            address=item.get('address', ''),
                            commodities=item.get('commodities', item.get('lotName', '')),
                            volume=item.get('volume', ''),
                            incoterms=item.get('incoterms', 'CIF'),
                            payable=item.get('payable', ''),
                            status=item.get('status', 'New RFQ'),
                            bl_code=item.get('blCode', ''),
                            date=item.get('date', '')
                        ))
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"[DB MIGRATION] Inquiries migration error: {e}")

        # 2. Consignments
        consign_file = os.path.join(DATA_DIR, 'consignments.json')
        if os.path.exists(consign_file):
            try:
                with open(consign_file, 'r', encoding='utf-8') as f:
                    consigns = json.load(f)
                for item in consigns:
                    bl_code = item.get('bl')
                    if bl_code and not session.query(ConsignmentModel).filter_by(bl=bl_code).first():
                        session.add(ConsignmentModel(
                            bl=bl_code,
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
                            stage=int(item.get('stage', 1)),
                            status=item.get('status', 'Stage 1: Mandi Sourced & Grading'),
                            inv_ref=item.get('invRef', ''),
                            phyto_ref=item.get('phytoRef', ''),
                            coa_ref=item.get('coaRef', ''),
                            bl_ref=item.get('blRef', '')
                        ))
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"[DB MIGRATION] Consignments migration error: {e}")

        # Ensure default baseline consignments if none exist
        if session.query(ConsignmentModel).count() == 0:
            default_consigns = [
                ConsignmentModel(
                    bl="GGE-JNPT-2026",
                    inquiry_ref="RFQ-2026-DXB-101",
                    buyer="Al-Noor Foodstuff Trading LLC (Dubai)",
                    commodity="24.0 MT · Tur Dal (Sortex Grade-A)",
                    vessel="MSC VALERIA (IMO 9461439)",
                    pod="Jebel Ali Port, Dubai (UAE)",
                    eta="In 2 Days (~36 Hrs)",
                    container="MSCU 892104-7 (20' GP)",
                    stage=4,
                    status="Stage 4: In Oceanic Transit",
                    inv_ref="INV-2026-089",
                    phyto_ref="PHYTO-IN-88219",
                    coa_ref="COA-SGS-99214",
                    bl_ref="MEDUIN194820",
                    updated_at=time.time()
                ),
                ConsignmentModel(
                    bl="GGE-RTM-8821",
                    inquiry_ref="RFQ-2026-RTM-202",
                    buyer="Rotterdam Agri-Commodities B.V.",
                    commodity="48.0 MT · Chia Seeds & Moringa Powder",
                    vessel="CMA CGM ANTOINE DE SAINT EXUPERY",
                    pod="Port of Rotterdam (Netherlands)",
                    eta="In 8 Days",
                    container="CMAU 492019-3 (40' HC)",
                    stage=4,
                    status="Stage 4: In Oceanic Transit (Red Sea)",
                    inv_ref="INV-2026-104",
                    phyto_ref="PHYTO-IN-90112",
                    coa_ref="COA-INTERTEK-4412",
                    bl_ref="CMACUS881290",
                    updated_at=time.time()
                ),
                ConsignmentModel(
                    bl="GGE-SGP-3104",
                    inquiry_ref="RFQ-2026-SIN-303",
                    buyer="SingaTrade Global Pte Ltd",
                    commodity="26.0 MT · Chana Dal (Sortex Grade-A)",
                    vessel="EVER GIVEN (IMO 9811000)",
                    pod="Port of Singapore (PSA Jurong)",
                    eta="Discharged & Gate Cleared",
                    container="EGLV 901823-1 (20' GP)",
                    stage=6,
                    status="Stage 6: Port Cleared & Delivered",
                    inv_ref="INV-2026-042",
                    phyto_ref="PHYTO-IN-77189",
                    coa_ref="COA-NABL-3310",
                    bl_ref="EGLV00291823",
                    updated_at=time.time()
                )
            ]
            for dc in default_consigns:
                session.add(dc)
            session.commit()

        # 3. Commodity Prices
        DEFAULT_COMMODITY_PRICES = {
            "p1": {"name": "Classic Toor (Tur Dal)", "category": "Pulses", "baseUsd": 820.0},
            "p2": {"name": "Classic Moong (Whole)", "category": "Pulses", "baseUsd": 840.0},
            "p3": {"name": "Classic Chana Dal", "category": "Pulses", "baseUsd": 760.0},
            "p4": {"name": "Classic Masoor (Red Split)", "category": "Pulses", "baseUsd": 790.0},
            "p5": {"name": "Chia Seeds (Superfood)", "category": "Seeds", "baseUsd": 1850.0},
            "p6": {"name": "Coriander Seeds (Dhania)", "category": "Spices", "baseUsd": 1420.0},
            "p7": {"name": "Cumin Seeds (Jeera Whole)", "category": "Spices", "baseUsd": 3800.0},
            "p8": {"name": "Moringa Leaf Powder", "category": "Powders", "baseUsd": 3800.0},
            "p9": {"name": "Mint Powder (Pudina)", "category": "Powders", "baseUsd": 3200.0},
            "p10": {"name": "Coriander Powder", "category": "Powders", "baseUsd": 1650.0},
            "p11": {"name": "Jowar (Whole Sorghum)", "category": "Grains", "baseUsd": 520.0},
            "p12": {"name": "Jowar Flour (Sorghum Flour)", "category": "Grains", "baseUsd": 620.0},
            "p13": {"name": "Tissue Paper Virgin Pulp", "category": "Paper", "baseUsd": 1150.0},
            "p14": {"name": "Emmer Wheat (Khapli Wheat)", "category": "Grains", "baseUsd": 680.0},
            "p15": {"name": "Pure Cow Ghee (Desi Bilona)", "category": "Dairy", "baseUsd": 6800.0},
            "p17": {"name": "Indian Home Spices (Individual Lots)", "category": "Spices", "baseUsd": 2450.0}
        }

        DEFAULT_DOMESTIC_PACKS = {
            "p1": {"500g": 85.0, "1kg": 160.0, "5kg": 775.0, "25kg": 3750.0},
            "p2": {"500g": 80.0, "1kg": 150.0, "5kg": 725.0, "25kg": 3500.0},
            "p3": {"500g": 65.0, "1kg": 120.0, "5kg": 575.0, "25kg": 2750.0},
            "p4": {"500g": 70.0, "1kg": 130.0, "5kg": 625.0, "25kg": 3000.0},
            "p5": {"500g": 190.0, "1kg": 360.0, "5kg": 1700.0, "25kg": 8200.0},
            "p6": {"500g": 95.0, "1kg": 180.0, "5kg": 850.0, "25kg": 4100.0},
            "p7": {"500g": 240.0, "1kg": 460.0, "5kg": 2200.0, "25kg": 10500.0},
            "p8": {"500g": 220.0, "1kg": 420.0, "5kg": 2000.0, "25kg": 9500.0},
            "p9": {"500g": 180.0, "1kg": 340.0, "5kg": 1600.0, "25kg": 7800.0},
            "p10": {"500g": 110.0, "1kg": 210.0, "5kg": 1000.0, "25kg": 4800.0},
            "p11": {"500g": 45.0, "1kg": 80.0, "5kg": 380.0, "25kg": 1800.0},
            "p12": {"500g": 50.0, "1kg": 90.0, "5kg": 430.0, "25kg": 2050.0},
            "p13": {"500g": 150.0, "1kg": 280.0, "5kg": 1300.0, "25kg": 5800.0},
            "p14": {"500g": 55.0, "1kg": 100.0, "5kg": 480.0, "25kg": 2300.0},
            "p15": {"500g": 450.0, "1kg": 850.0, "5kg": 4100.0, "25kg": 19800.0},
            "p17": {"500g": 160.0, "1kg": 300.0, "5kg": 1420.0, "25kg": 6800.0}
        }

        LEGACY_DOMESTIC_PACKS = {
            "p1": {"500g": 90.0, "1kg": 160.0, "5kg": 780.0, "25kg": 3750.0},
            "p2": {"500g": 85.0, "1kg": 150.0, "5kg": 720.0, "25kg": 3450.0},
            "p3": {"500g": 70.0, "1kg": 125.0, "5kg": 590.0, "25kg": 2800.0},
            "p4": {"500g": 75.0, "1kg": 135.0, "5kg": 640.0, "25kg": 3050.0},
            "p5": {"500g": 190.0, "1kg": 350.0, "5kg": 1680.0, "25kg": 8000.0},
            "p6": {"500g": 110.0, "1kg": 200.0, "5kg": 950.0, "25kg": 4500.0},
            "p7": {"500g": 280.0, "1kg": 520.0, "5kg": 2480.0, "25kg": 11800.0},
            "p8": {"500g": 220.0, "1kg": 400.0, "5kg": 1900.0, "25kg": 9000.0},
            "p9": {"500g": 180.0, "1kg": 330.0, "5kg": 1550.0, "25kg": 7400.0},
            "p10": {"500g": 120.0, "1kg": 220.0, "5kg": 1050.0, "25kg": 5000.0},
            "p11": {"500g": 40.0, "1kg": 75.0, "5kg": 350.0, "25kg": 1650.0},
            "p12": {"500g": 45.0, "1kg": 85.0, "5kg": 400.0, "25kg": 1900.0},
            "p13": {"500g": 150.0, "1kg": 280.0, "5kg": 1300.0, "25kg": 5800.0},
            "p14": {"500g": 55.0, "1kg": 100.0, "5kg": 480.0, "25kg": 2300.0},
            "p15": {"500g": 450.0, "1kg": 850.0, "5kg": 4100.0, "25kg": 19800.0},
            "p17": {"500g": 160.0, "1kg": 300.0, "5kg": 1420.0, "25kg": 6800.0}
        }

        # Purge deprecated duplicate sorghum if present
        session.query(CommodityPriceModel).filter_by(code="p16").delete()

        for code, def_item in DEFAULT_COMMODITY_PRICES.items():
            rec = session.query(CommodityPriceModel).filter_by(code=code).first()
            def_packs_json = json.dumps(DEFAULT_DOMESTIC_PACKS.get(code, {}))
            legacy_item = LEGACY_DOMESTIC_PACKS.get(code, {})
            if not rec:
                session.add(CommodityPriceModel(
                    code=code,
                    name=def_item['name'],
                    category=def_item['category'],
                    base_usd=def_item['baseUsd'],
                    price_inr=def_item['baseUsd'],
                    margin_pct=0.0,
                    domestic_packs_json=def_packs_json
                ))
            else:
                if rec.name != def_item['name']:
                    rec.name = def_item['name']
                if not rec.base_usd or rec.base_usd == 0:
                    rec.base_usd = def_item['baseUsd']
                    if not rec.price_inr: rec.price_inr = def_item['baseUsd']
                curr_p = {}
                try:
                    if hasattr(rec, 'domestic_packs_json') and rec.domestic_packs_json:
                        curr_p = {k: float(v) for k, v in json.loads(rec.domestic_packs_json).items()}
                except Exception:
                    pass
                if not curr_p:
                    rec.domestic_packs_json = def_packs_json

        # Also migrate commodity_specifications if empty
        for s_rec in session.query(CommoditySpecificationModel).all():
            if s_rec.code in DEFAULT_DOMESTIC_PACKS:
                curr_sp = {}
                try:
                    if s_rec.domestic_packs_json:
                        curr_sp = {k: float(v) for k, v in json.loads(s_rec.domestic_packs_json).items()}
                except Exception:
                    pass
                if not curr_sp:
                    s_rec.domestic_packs_json = json.dumps(DEFAULT_DOMESTIC_PACKS[s_rec.code])

        session.commit()

        # 4. Audit Log
        audit_file = os.path.join(DATA_DIR, 'audit_log.json')
        if os.path.exists(audit_file):
            try:
                with open(audit_file, 'r', encoding='utf-8') as f:
                    logs = json.load(f)
                for item in logs:
                    aid = item.get('id')
                    if aid and not session.query(AuditLogModel).filter_by(id=aid).first():
                        session.add(AuditLogModel(
                            id=aid,
                            timestamp=item.get('timestamp', ''),
                            operator=item.get('operator', ''),
                            action=item.get('action', ''),
                            entity_id=item.get('entityId', ''),
                            previous_state=item.get('previousState', ''),
                            new_state=item.get('newState', ''),
                            details=item.get('details', ''),
                            prev_hash=item.get('prevHash', ''),
                            hash=item.get('hash', '')
                        ))
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"[DB MIGRATION] Audit log migration error: {e}")

        # 5. Domestic Orders
        dom_file = os.path.join(DATA_DIR, 'domestic_orders.json')
        if os.path.exists(dom_file):
            try:
                with open(dom_file, 'r', encoding='utf-8') as f:
                    doms = json.load(f)
                for item in doms:
                    did = item.get('id') or item.get('orderId')
                    if did and not session.query(DomesticOrderModel).filter_by(id=did).first():
                        session.add(DomesticOrderModel(
                            id=did,
                            commodity=item.get('commodity', ''),
                            pack_size=item.get('packSize', item.get('pack_size', '1kg')),
                            quantity=int(item.get('quantity', item.get('qty', 1))),
                            amount=float(item.get('amount', 0.0)),
                            consignee_name=item.get('consigneeName', item.get('name', '')),
                            consignee_phone=item.get('consigneePhone', item.get('phone', '')),
                            consignee_email=item.get('consigneeEmail', item.get('email', '')),
                            delivery_address=item.get('deliveryAddress', item.get('address', '')),
                            city=item.get('city', ''),
                            state=item.get('state', 'Maharashtra'),
                            pincode=item.get('pincode', ''),
                            gstin=item.get('gstin', ''),
                            upi_vpa=item.get('upiVpa', ''),
                            upi_utr=item.get('upiUtr', item.get('utr', '')),
                            payment_status=item.get('paymentStatus', item.get('payment_status', 'PAID')),
                            order_status=item.get('orderStatus', item.get('status', 'Payment Received · Hub Allocation')),
                            tax_invoice_ref=item.get('taxInvoiceRef', ''),
                            courier_partner=item.get('courierPartner', 'Blue Dart Express Surface'),
                            tracking_number=item.get('trackingNumber', item.get('tracking_number', '')),
                            created_at=float(item.get('createdAt', time.time())),
                            updated_at=float(item.get('updatedAt', time.time()))
                        ))
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"[DB MIGRATION] Domestic orders migration error: {e}")

        # Also populate DomesticOrderModel from any existing domestic inquiry records if table is empty
        try:
            if session.query(DomesticOrderModel).count() == 0:
                dom_inqs = session.query(InquiryModel).filter(
                    (InquiryModel.type == 'DOMESTIC_ORDER') |
                    (InquiryModel.id.like('GGE-DOM-%')) |
                    (InquiryModel.id.like('DOM-%'))
                ).all()
                for inq in dom_inqs:
                    session.add(DomesticOrderModel(
                        id=inq.id,
                        commodity=inq.commodities or 'Classic Toor (Tur Dal)',
                        pack_size=inq.pack_size or '1kg',
                        quantity=inq.pack_quantity or 1,
                        amount=160.0,
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
                        tax_invoice_ref=inq.tax_invoice_ref or f"TAX-INV-{inq.id}",
                        courier_partner=inq.courier_partner or 'Blue Dart Express Surface',
                        tracking_number=inq.tracking_number or '',
                        created_at=inq.created_at or time.time(),
                        updated_at=time.time()
                    ))
                session.commit()
        except Exception as e:
            session.rollback()
            print(f"[DB MIGRATION] Domestic orders inquiry-bridge error: {e}")

        # Ensure flat file JSON mirrors are fully synchronized with SQLite records
        try:
            from backend.core.atomic_io import atomic_json_write
            db_inqs = [r.to_dict() for r in session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()]
            if db_inqs:
                atomic_json_write(inq_file, db_inqs)

            db_consigns = [r.to_dict() for r in session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()]
            if db_consigns:
                atomic_json_write(consign_file, db_consigns)

            db_audits = [r.to_dict() for r in session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).all()]
            if db_audits:
                atomic_json_write(audit_file, db_audits)

            db_doms = [r.to_dict() for r in session.query(DomesticOrderModel).order_by(DomesticOrderModel.created_at.desc()).all()]
            if db_doms:
                atomic_json_write(dom_file, db_doms)

            db_prices = {r.code: r.to_dict() for r in session.query(CommodityPriceModel).all()}
            if db_prices:
                atomic_json_write(os.path.join(DATA_DIR, 'prices.json'), db_prices)

            db_commodities = {r.code: r.to_dict() for r in session.query(CommoditySpecificationModel).all()}
            if db_commodities:
                atomic_json_write(os.path.join(DATA_DIR, 'commodities.json'), db_commodities)
        except Exception as e:
            print(f"[DB MIGRATION] Mirror sync warning: {e}")

    finally:
        session.close()

if __name__ == '__main__':
    init_db()
    print("Database initialization and migration complete.")

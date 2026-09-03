import os
import json
import time
from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Text, event
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, 'enterprise.db')
DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{DB_PATH}')

# Engine with connection pooling and SQLite WAL mode
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True
)

# Enable SQLite Write-Ahead Logging (WAL) for high concurrency
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA busy_timeout=5000;")
        cursor.close()

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

# ================= 1. DATABASE MODELS =================

class InquiryModel(Base):
    __tablename__ = 'inquiries'

    id = Column(String(64), primary_key=True, index=True)
    type = Column(String(32), default='BULK_INQUIRY')
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
    status = Column(String(64), default='New RFQ')
    bl_code = Column(String(64), default='')
    date = Column(String(64), default='')
    created_at = Column(Float, default=time.time)

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
            'createdAt': self.created_at
        }

class ConsignmentModel(Base):
    __tablename__ = 'consignments'

    bl = Column(String(64), primary_key=True, index=True)
    inquiry_ref = Column(String(64), index=True, default='')
    quotation_ref = Column(String(64), default='')
    buyer = Column(String(128), default='')
    buyer_email = Column(String(128), default='')
    buyer_phone = Column(String(64), default='')
    commodity = Column(String(256), default='')
    vessel = Column(String(128), default='Pending Ocean Booking')
    pod = Column(String(128), default='')
    eta = Column(String(64), default='Pending Ocean Schedule')
    container = Column(String(64), default='PENDING ALLOCATION')
    stage = Column(Integer, default=1)
    status = Column(String(128), default='Stage 1: Mandi Sourced & Grading')
    inv_ref = Column(String(128), default='')
    phyto_ref = Column(String(128), default='')
    coa_ref = Column(String(128), default='')
    bl_ref = Column(String(128), default='')
    updated_at = Column(Float, default=time.time)

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
    updated_at = Column(Float, default=time.time)

    def to_dict(self):
        val = self.base_usd if (self.base_usd is not None and self.base_usd > 0) else self.price_inr
        return {
            'code': self.code,
            'name': self.name,
            'category': self.category,
            'baseUsd': val,
            'price': val,
            'marginPct': self.margin_pct,
            'updatedAt': self.updated_at
        }

class AuditLogModel(Base):
    __tablename__ = 'audit_logs'

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(String(64), default='')
    operator = Column(String(128), default='')
    action = Column(String(128), default='')
    entity_id = Column(String(128), default='')
    previous_state = Column(String(256), default='')
    new_state = Column(String(256), default='')
    details = Column(Text, default='')
    prev_hash = Column(String(64), default='')
    hash = Column(String(64), default='')

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'operator': self.operator,
            'action': self.action,
            'entityId': self.entity_id,
            'previousState': self.previous_state,
            'newState': self.new_state,
            'details': self.details,
            'prevHash': self.prev_hash,
            'hash': self.hash
        }

class AdminSessionModel(Base):
    __tablename__ = 'admin_sessions'

    token = Column(String(128), primary_key=True, index=True)
    email = Column(String(128), default='')
    created_at = Column(Float, default=time.time)
    expires_at = Column(Float, default=0.0)

# ================= 2. INITIALIZATION & MIGRATION =================

def init_db():
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            cursor = conn.connection.cursor()
            cursor.execute("PRAGMA table_info(commodity_prices);")
            cols = [col[1] for col in cursor.fetchall()]
            if 'base_usd' not in cols:
                cursor.execute("ALTER TABLE commodity_prices ADD COLUMN base_usd FLOAT DEFAULT 0.0;")
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
            "p12": {"name": "Jowar Flour (Gluten Free)", "category": "Flours", "baseUsd": 580.0},
            "p13": {"name": "Tissue Paper Virgin Pulp", "category": "Paper", "baseUsd": 1150.0}
        }

        for code, def_item in DEFAULT_COMMODITY_PRICES.items():
            rec = session.query(CommodityPriceModel).filter_by(code=code).first()
            if not rec:
                session.add(CommodityPriceModel(
                    code=code,
                    name=def_item['name'],
                    category=def_item['category'],
                    base_usd=def_item['baseUsd'],
                    price_inr=def_item['baseUsd'],
                    margin_pct=0.0
                ))
            elif not rec.base_usd or rec.base_usd == 0:
                rec.base_usd = def_item['baseUsd']
                if not rec.price_inr: rec.price_inr = def_item['baseUsd']
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

    finally:
        session.close()

if __name__ == '__main__':
    init_db()
    print("Database initialization and migration complete.")

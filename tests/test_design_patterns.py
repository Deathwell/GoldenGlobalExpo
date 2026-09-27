"""
Golden Global Expo — Design Patterns & Software Architecture Test Suite
Comprehensive automated test suite verifying the architecture refactor:
1. Strategy & Factory Patterns (Payment & Settlement)
2. Repository Pattern (Decoupled Persistence & Querying)
3. Domain Services (Domestic Orders, Consignments, Inquiries)
4. Builder & Template Method Patterns (Invoice & Document Generation)
5. Observer & Event Dispatcher Patterns (Domain Event Bus & Subscribers)
6. Statutory Tax Calculation Engine (Indian GST & HSN Rules)
"""
import time
import json
import threading
import pytest
from typing import Dict, Any
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.config import ADMIN_PASSWORD
from backend.db import (
    Base, DomesticOrderModel, ConsignmentModel, InquiryModel,
    AuditLogModel, PaymentSessionModel
)
from backend.repositories.domestic_order_repo import DomesticOrderRepository
from backend.repositories.consignment_repo import ConsignmentRepository
from backend.repositories.inquiry_repo import InquiryRepository
from backend.repositories.audit_repo import AuditRepository, compute_entry_hash
from backend.repositories.payment_session_repo import PaymentSessionRepository

from backend.services.tax_service import TaxCalculationService, TaxComputationResult
from backend.services.invoice_builder import InvoiceBuilder, SELLER_DETAILS
from backend.services.payment_strategies import (
    PaymentStrategy, RazorpayStrategy, MockPaymentStrategy,
    FreightCollectStrategy, ProformaWireStrategy, PaymentStrategyFactory
)
from backend.services.event_dispatcher import (
    DomainEvent, DomainEventPublisher, EventSubscriber,
    OrderPlacedEvent, PaymentVerifiedEvent, DomesticPaymentVerifiedEvent,
    ConsignmentUpdatedEvent, DomesticOrderUpdatedEvent, InquiryCreatedEvent,
    APMMetricsSubscriber, get_event_publisher, get_apm_event_metrics
)
from backend.services.domestic_order_service import DomesticOrderService
from backend.services.consignment_service import ConsignmentService
from backend.services.inquiry_service import InquiryService


# ==============================================================================
# 1. STRATEGY & FACTORY PATTERN TESTS
# ==============================================================================

def test_payment_strategy_factory_resolution_by_string():
    """Verify PaymentStrategyFactory resolves correct strategy classes by key name."""
    razorpay = PaymentStrategyFactory.get_strategy("razorpay")
    assert isinstance(razorpay, RazorpayStrategy)

    mock = PaymentStrategyFactory.get_strategy("mock")
    assert isinstance(mock, MockPaymentStrategy)

    freight = PaymentStrategyFactory.get_strategy("freight_collect")
    assert isinstance(freight, FreightCollectStrategy)

    proforma = PaymentStrategyFactory.get_strategy("proforma_invoice")
    assert isinstance(proforma, ProformaWireStrategy)

    # Unknown strategy defaults safely to RazorpayStrategy (Liskov Substitution Principle)
    fallback = PaymentStrategyFactory.get_strategy("unknown_future_gateway")
    assert isinstance(fallback, RazorpayStrategy)


def test_payment_strategy_factory_resolution_by_dict():
    """Verify PaymentStrategyFactory inspects request payload metadata and flags."""
    # Freight collect settlement method
    strat_fc = PaymentStrategyFactory.get_strategy({"settlementMethod": "freight_collect"})
    assert isinstance(strat_fc, FreightCollectStrategy)

    # Proforma wire settlement method
    strat_pf = PaymentStrategyFactory.get_strategy({"settlementMethod": "proforma_invoice"})
    assert isinstance(strat_pf, ProformaWireStrategy)

    # Mock payment explicit flag
    strat_mock1 = PaymentStrategyFactory.get_strategy({"is_mock": True})
    assert isinstance(strat_mock1, MockPaymentStrategy)

    strat_mock2 = PaymentStrategyFactory.get_strategy({"metadata": {"is_mock": True}})
    assert isinstance(strat_mock2, MockPaymentStrategy)

    # Mock order ID prefixes
    strat_mock3 = PaymentStrategyFactory.get_strategy({"orderId": "order_mock_test_123"})
    assert isinstance(strat_mock3, MockPaymentStrategy)

    strat_mock4 = PaymentStrategyFactory.get_strategy({"sampleId": "GGE-SMP-MOCK-456"})
    assert isinstance(strat_mock4, MockPaymentStrategy)

    strat_mock5 = PaymentStrategyFactory.get_strategy({"paymentId": "mock_pay_9999"})
    assert isinstance(strat_mock5, MockPaymentStrategy)

    # Standard production payload
    strat_prod = PaymentStrategyFactory.get_strategy({"amount": 1000, "currency": "INR"})
    assert isinstance(strat_prod, RazorpayStrategy)


def test_payment_strategy_factory_open_closed_extensibility():
    """Verify Open-Closed Principle (OCP): new strategies can be registered at runtime without code modification."""
    class CustomCryptoStrategy(PaymentStrategy):
        def create_session(self, data: Dict[str, Any], session) -> Dict[str, Any]:
            return {"status": "crypto_escrow_initialized", "wallet": "0xABC123"}
        def verify_settlement(self, data, request, session, background_tasks=None):
            return {"status": "crypto_confirmed"}
        def handle_webhook(self, data, request, session, background_tasks=None):
            return {"status": "webhook_handled"}
        def get_status(self, order_id: str, session):
            return {"status": "pending_blockchain_confirmation"}

    # Register new strategy
    PaymentStrategyFactory.register_strategy("crypto", CustomCryptoStrategy)

    resolved = PaymentStrategyFactory.get_strategy("crypto")
    assert isinstance(resolved, CustomCryptoStrategy)
    result = resolved.create_session({}, None)
    assert result["wallet"] == "0xABC123"

    # Clean up registry
    if "crypto" in PaymentStrategyFactory._registry:
        del PaymentStrategyFactory._registry["crypto"]


def test_payment_strategies_session_creation(db_session):
    """Verify polymorphic execution of create_session across all built-in strategies."""
    # 1. Freight Collect Strategy
    fc_strat = FreightCollectStrategy()
    fc_res = fc_strat.create_session({
        "sampleId": "GGE-SMP-FC-TEST",
        "name": "Global Importer",
        "email": "buyer@rotterdam.nl",
        "address": "Terminal 4, Port of Rotterdam, Netherlands",
        "carrier": "DHL Express",
        "courierAccount": "DHL-ACCT-98765"
    }, db_session)
    assert fc_res["success"] is True
    assert fc_res["settlementMethod"] == "freight_collect"
    assert fc_res["carrier"] == "DHL Express"

    # 2. Proforma Wire Strategy
    pw_strat = ProformaWireStrategy()
    pw_res = pw_strat.create_session({
        "sampleId": "GGE-SMP-PW-TEST",
        "name": "Euro Grain Corp",
        "email": "finance@eurograin.com",
        "address": "Rotterdam Harbor Boulevard 12, Netherlands",
        "company": "Euro Grain BV",
        "amount": 2500.0,
        "currency": "EUR"
    }, db_session)
    assert pw_res["success"] is True
    assert pw_res["settlementMethod"] == "proforma_invoice"
    assert pw_res["orderId"] == "GGE-SMP-PW-TEST"
    assert pw_res["company"] == "Euro Grain BV"

    # 3. Mock Payment Strategy
    mock_strat = MockPaymentStrategy()
    mock_res = mock_strat.create_session({
        "amount": 150.0,
        "currency": "INR",
        "metadata": {"name": "Test User", "commodity": "Chia Seeds"}
    }, db_session)
    assert mock_res["success"] is True
    assert mock_res["orderId"].startswith("order_")
    assert mock_res["amount"] == 15000
    assert mock_res["currency"] == "INR"


# ==============================================================================
# 2. REPOSITORY PATTERN TESTS
# ==============================================================================

def test_domestic_order_repository_crud_and_queries(db_session):
    """Verify DomesticOrderRepository encapsulates all SQL queries and CRUD operations."""
    repo = DomesticOrderRepository(db_session)
    test_id = f"GGE-DOM-TEST-{int(time.time())}"

    # Create & Save
    order = DomesticOrderModel(
        id=test_id,
        consignee_name="Pooja Sharma",
        consignee_phone="+919876543210",
        consignee_email="pooja@example.com",
        delivery_address="402 Marine Drive, Mumbai",
        city="Mumbai",
        state="Maharashtra",
        pincode="400020",
        commodity="Pure Cow Ghee (Desi Bilona)",
        pack_size="1kg",
        quantity=2,
        amount=1700.0,
        upi_utr="UTR-REPO-TEST-9988",
        payment_status="PAID",
        order_status="PROCESSING",
        tracking_number="AWB-TRK-776655"
    )
    saved = repo.save(order)
    db_session.commit()
    assert saved.id == test_id

    # Get by ID
    fetched = repo.get_by_id(test_id)
    assert fetched is not None
    assert fetched.consignee_name == "Pooja Sharma"

    # Find by UTR
    by_utr = repo.find_by_utr("utr-repo-test-9988")  # Case-insensitive
    assert by_utr is not None
    assert by_utr.id == test_id

    # Find by Tracking Number
    by_trk = repo.find_by_tracking_number("awb-trk-776655")  # Case-insensitive
    assert by_trk is not None
    assert by_trk.id == test_id

    # Filter Orders by search query & status
    results = repo.find_orders(status="paid", search="Pooja")
    assert len(results) >= 1
    assert any(r.id == test_id for r in results)

    # Count
    total = repo.count()
    assert total >= 1

    # Delete
    deleted = repo.delete(fetched)
    db_session.commit()
    assert deleted is True
    assert repo.get_by_id(test_id) is None


def test_consignment_repository_multi_ref_lookup(db_session):
    """Verify ConsignmentRepository handles multi-reference searches with injection immunity."""
    repo = ConsignmentRepository(db_session)
    test_bl = f"BL-REPO-{int(time.time())}"

    consignment = ConsignmentModel(
        bl=test_bl,
        container="MSCU9876543",
        inquiry_ref="RFQ-INT-2026",
        quotation_ref="QTN-9988",
        status="Stage 3: Customs Cleared & Loading",
        stage=3,
        pod="Rotterdam, Netherlands",
        vessel="MV Golden Star",
        commodity="Non-Basmati White Rice"
    )
    repo.save(consignment)
    db_session.commit()

    # Multi-reference queries across different fields
    assert repo.find_by_multi_ref(test_bl.lower()) is not None
    assert repo.find_by_multi_ref("mscu9876543") is not None
    assert repo.find_by_multi_ref("rfq-int-2026") is not None
    assert repo.find_by_multi_ref("qtn-9988") is not None
    assert repo.find_by_multi_ref("NON_EXISTENT_REF") is None

    # Delete by BL
    del_count = repo.delete_by_bl(test_bl)
    db_session.commit()
    assert del_count == 1
    assert repo.get_by_bl(test_bl) is None


def test_inquiry_repository_operations(db_session):
    """Verify InquiryRepository persistence contracts and custom lookups."""
    repo = InquiryRepository(db_session)
    test_inq_id = f"INQ-REPO-{int(time.time())}"

    inq = InquiryModel(
        id=test_inq_id,
        name="Heinrich Mueller",
        email="h.mueller@bavaria-imports.de",
        company="Bavaria Agri Trade GmbH",
        country="Germany",
        commodities="Chia Seeds",
        volume="20 MT",
        tracking_number="TRK-INQ-1234",
        utr="UTR-INQ-5678"
    )
    repo.save(inq)
    db_session.commit()

    # Lookup operations
    assert repo.get_by_id(test_inq_id) is not None
    assert repo.find_by_tracking_or_utr("trk-inq-1234") is not None
    assert repo.find_by_tracking_or_utr("utr-inq-5678") is not None

    # Cleanup
    del_count = repo.delete_by_id(test_inq_id)
    db_session.commit()
    assert del_count == 1
    assert repo.get_by_id(test_inq_id) is None


def test_audit_repository_hash_chain_and_verification():
    """Verify AuditRepository maintains cryptographic SHA-256 hash chaining and tamper detection in hermetic session."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        repo = AuditRepository(session)

        # Append 3 sequential audit entries
        e1 = repo.append_entry(
            operator="Security Officer",
            action="TEST_ACTION_1",
            entity_id="ENT-001",
            prev_state="CREATED",
            new_state="PENDING",
            details="Initial test entry"
        )
        session.commit()

        e2 = repo.append_entry(
            operator="Security Officer",
            action="TEST_ACTION_2",
            entity_id="ENT-002",
            prev_state="PENDING",
            new_state="VERIFIED",
            details="Second chained entry"
        )
        session.commit()

        assert e2.prev_hash == e1.hash
        assert e2.hash != e1.hash

        # Verify intact chain
        is_valid, count, corrupted = repo.verify_chain()
        assert is_valid is True
        assert count == 2
        assert len(corrupted) == 0

        # Tamper with entry e1 directly in persistence layer
        e1.details = "TAMPERED DETAILS UNNOTICED"
        session.commit()

        # Verify that chain verification detects corruption immediately
        is_valid_after_tamper, count, corrupted_after = repo.verify_chain()
        assert is_valid_after_tamper is False
        assert len(corrupted_after) > 0
        assert e1.id in corrupted_after
    finally:
        session.close()


def test_payment_session_repository_ttl_pruning(db_session):
    """Verify PaymentSessionRepository lifecycle and TTL pruning of abandoned sessions."""
    repo = PaymentSessionRepository(db_session)
    order_id = f"order_ttl_test_{int(time.time())}"

    # Create session
    rec = repo.create_or_update(
        order_id=order_id,
        amount=499.0,
        currency="INR",
        metadata={"item": "Tur Dal"}
    )
    db_session.commit()

    fetched = repo.get_by_order_id(order_id)
    assert fetched is not None
    assert fetched.amount == 499.0
    assert fetched.status == "created"

    # Simulate expired timestamp
    fetched.created_at = time.time() - 90000  # > 24 hours ago
    db_session.commit()

    # Pruning with 86400s (24h) threshold should delete it
    pruned = repo.prune_expired(ttl_seconds=86400)
    assert pruned >= 1
    assert repo.get_by_order_id(order_id) is None


# ==============================================================================
# 3. BUILDER & TEMPLATE METHOD PATTERN TESTS (INVOICE BUILDER)
# ==============================================================================

def test_invoice_builder_html_and_payload_generation():
    """Verify InvoiceBuilder modular construction and statutory layout generation."""
    order_data = {
        "id": "GGE-DOM-9876",
        "consigneeName": "Aditya Verma",
        "consigneePhone": "+919820011223",
        "consigneeEmail": "aditya@example.in",
        "deliveryAddress": "Flat 8B, High Street",
        "city": "Bengaluru",
        "state": "Karnataka",  # Interstate -> IGST
        "pincode": "560001",
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 3,
        "amount": 480.0,
        "upiUtr": "UTR-BLD-TEST-1234",
        "taxInvoiceRef": "TAX-INV-DOM-9876",
        "courierPartner": "Blue Dart Express",
        "trackingNumber": "BD-AWB-998877"
    }

    builder = InvoiceBuilder(order_data)

    # 1. Test Step Methods (Template Method Components)
    header_html = builder.build_header()
    assert "TAX INVOICE" in header_html
    assert "TAX-INV-DOM-9876" in header_html
    assert "GOLDEN GLOBAL EXPO" in header_html

    seller_buyer_html = builder.build_seller_buyer_details()
    assert "Aditya Verma" in seller_buyer_html
    assert "Bengaluru" in seller_buyer_html
    assert "Blue Dart Express" in seller_buyer_html
    assert "BD-AWB-998877" in seller_buyer_html

    items_html = builder.build_items_table()
    assert "Classic Toor (Tur Dal)" in items_html
    assert "0713" in items_html  # HSN Code
    assert "1kg" in items_html
    assert "IGST" in items_html  # Interstate to Karnataka

    tax_summary_html = builder.build_tax_summary()
    assert "Payment Verified" in tax_summary_html
    assert "480.00" in tax_summary_html

    signatory_html = builder.build_signatory_block()
    assert "Authorized Signatory" in signatory_html or "computer-generated" in signatory_html

    # 2. Test Full Rendered HTML Document
    full_html = builder.render_html()
    assert "<!DOCTYPE html>" in full_html
    assert "@media print" in full_html
    assert "TAX-INV-DOM-9876" in full_html
    assert "Aditya Verma" in full_html
    assert "IGST" in full_html

    # 3. Test Structured JSON Payload
    payload = builder.build_payload()
    assert payload["success"] is True
    assert payload["invoiceNumber"] == "TAX-INV-DOM-9876"
    assert payload["totalAmount"] == 480.0
    assert payload["consignee"]["name"] == "Aditya Verma"
    assert payload["consignee"]["state"] == "Karnataka"
    assert payload["item"]["hsnCode"] == "0713"
    assert payload["taxBreakdown"]["isInterstate"] is True
    assert payload["taxBreakdown"]["igstRate"] == 0.05
    assert payload["shipping"]["courierPartner"] == "Blue Dart Express"


def test_invoice_builder_xss_escaping():
    """Verify InvoiceBuilder sanitizes user input against HTML/script injection."""
    malicious_order = {
        "id": "DOM-XSS-1",
        "consigneeName": "<script>alert('xss')</script>Rajesh",
        "deliveryAddress": "<img src=x onerror=alert(1)>",
        "commodity": "<b>Tur Dal</b>",
        "amount": 160.0,
        "quantity": 1,
        "state": "Maharashtra"
    }
    builder = InvoiceBuilder(malicious_order)
    rendered = builder.render_html()

    # Raw script/img tags must NOT be present unescaped
    assert "<script>" not in rendered
    assert "&lt;script&gt;" in rendered
    assert "<img src=x" not in rendered
    assert "&lt;img src=x" in rendered


# ==============================================================================
# 4. STATUTORY TAX CALCULATION ENGINE TESTS
# ==============================================================================

def test_tax_calculation_service_intra_state():
    """Verify Maharashtra destination splits 5% GST into CGST 2.5% + SGST 2.5%."""
    result = TaxCalculationService.compute_tax(
        total_amount=160.0,
        quantity=1,
        state="Maharashtra",
        commodity_name="Classic Toor (Tur Dal)"
    )
    assert result.is_intra_state is True
    assert result.is_interstate is False
    assert result.cgst_rate == 0.025
    assert result.sgst_rate == 0.025
    assert result.igst_rate == 0.0
    assert result.igst_amount == 0.0
    assert round(result.cgst_amount + result.sgst_amount, 2) == result.total_tax
    assert round(result.taxable_value + result.total_tax, 2) == 160.0
    assert result.hsn_code == "0713"


def test_tax_calculation_service_inter_state():
    """Verify non-Maharashtra destinations apply single 5% IGST."""
    for st in ["Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "West Bengal"]:
        res = TaxCalculationService.compute_tax(
            total_amount=1000.0,
            quantity=5,
            state=st,
            commodity_name="Cumin Seeds (Jeera Whole)"
        )
        assert res.is_intra_state is False
        assert res.is_interstate is True
        assert res.cgst_rate == 0.0
        assert res.sgst_rate == 0.0
        assert res.cgst_amount == 0.0
        assert res.sgst_amount == 0.0
        assert res.igst_rate == 0.05
        assert res.igst_amount == res.total_tax
        assert res.hsn_code == "0909"


def test_tax_calculation_service_hsn_classification():
    """Verify statutory HSN classification across agricultural commodity categories."""
    assert TaxCalculationService.get_commodity_hsn("Classic Toor Dal") == "0713"
    assert TaxCalculationService.get_commodity_hsn("Moong Whole") == "0713"
    assert TaxCalculationService.get_commodity_hsn("Chia Seeds (Superfood)") == "1207"
    assert TaxCalculationService.get_commodity_hsn("Coriander Seeds (Dhania)") == "0909"
    assert TaxCalculationService.get_commodity_hsn("Cumin Seeds (Jeera)") == "0909"
    assert TaxCalculationService.get_commodity_hsn("Moringa Leaf Powder") == "0910"
    assert TaxCalculationService.get_commodity_hsn("Mint Powder (Pudina)") == "0910"
    assert TaxCalculationService.get_commodity_hsn("Jowar Flour (Atta)") == "1102"
    assert TaxCalculationService.get_commodity_hsn("Jowar (Whole Sorghum)") == "1008"
    assert TaxCalculationService.get_commodity_hsn("Pure Cow Ghee (Bilona)") == "0405"
    assert TaxCalculationService.get_commodity_hsn("Tissue Paper") == "4818"
    assert TaxCalculationService.get_commodity_hsn("Unknown Item") == "0713"  # fallback


# ==============================================================================
# 5. OBSERVER & EVENT DISPATCHER PATTERN TESTS
# ==============================================================================

def test_domain_event_publisher_subscription_and_isolation():
    """Verify Observer pattern: subscribers receive published events with error fault-isolation."""
    publisher = DomainEventPublisher()
    received_events = []

    class MockSubscriber(EventSubscriber):
        def handle(self, event: DomainEvent, session=None):
            received_events.append(event)

    class FaultySubscriber(EventSubscriber):
        def handle(self, event: DomainEvent, session=None):
            raise RuntimeError("Intentional subscriber crash for isolation test")

    sub1 = MockSubscriber()
    sub2 = FaultySubscriber()

    publisher.subscribe(sub1)
    publisher.subscribe(sub2)

    # Publish an event
    test_event = DomainEvent(
        event_name="TEST_EVENT_NOTIFICATION",
        data={"message": "hello"},
        entity_id="TEST-001"
    )

    # Publishing must NOT crash even though sub2 raises an unhandled exception
    publisher.publish(test_event)

    assert len(received_events) == 1
    assert received_events[0].event_name == "TEST_EVENT_NOTIFICATION"

    # Unsubscribe test
    publisher.unsubscribe(sub1)
    publisher.publish(test_event)
    assert len(received_events) == 1  # No additional events received


def test_typed_domain_events_telemetry():
    """Verify strongly-typed domain events accurately initialize auditing telemetry."""
    # 1. OrderPlacedEvent
    ev_order = OrderPlacedEvent({"orderId": "DOM-101", "amount": 500})
    assert ev_order.event_name == "ORDER_PLACED"
    assert ev_order.entity_id == "DOM-101"
    assert ev_order.previous_state == "NONE"
    assert ev_order.new_state == "PENDING"

    # 2. PaymentVerifiedEvent
    ev_pay = PaymentVerifiedEvent({"orderId": "DOM-101", "utr": "UTR123"})
    assert ev_pay.event_name == "PAYMENT_CONFIRMED"
    assert ev_pay.entity_id == "DOM-101"
    assert ev_pay.previous_state == "PENDING"
    assert ev_pay.new_state == "CAPTURED"

    # 3. ConsignmentUpdatedEvent
    ev_cs = ConsignmentUpdatedEvent({"bl": "BL-9988", "stage": 4})
    assert ev_cs.event_name == "CONSIGNMENT_UPDATED"
    assert ev_cs.entity_id == "BL-9988"

    # 4. InquiryCreatedEvent
    ev_inq = InquiryCreatedEvent({"id": "INQ-777", "commodity": "Moong"})
    assert ev_inq.event_name == "NEW_INQUIRY"
    assert ev_inq.entity_id == "INQ-777"
    assert ev_inq.new_state == "ACTIVE_RFQ"


# ==============================================================================
# 6. ARCHITECTURAL HARDENING & BOUNDARY INTEGRATION TESTS
# ==============================================================================

def test_tax_service_hsn_word_boundaries():
    """Verify statutory HSN classification uses word-boundary matching to prevent substring collisions."""
    # Turmeric must match 0910 (Spices), NOT 0713 (Pulses) via substring 'tur'
    assert TaxCalculationService.get_commodity_hsn("Turmeric (Salem Whole Grade-A)") == "0910"
    assert TaxCalculationService.get_commodity_hsn("Organic Turmeric Powder") == "0910"
    assert TaxCalculationService.get_commodity_hsn("Salem Turmeric") == "0910"

    # Tur Dal must match 0713 (Pulses)
    assert TaxCalculationService.get_commodity_hsn("Classic Tur Dal") == "0713"
    assert TaxCalculationService.get_commodity_hsn("Toor Dal") == "0713"

    # Additional spice & commodity matches
    assert TaxCalculationService.get_commodity_hsn("Kashmiri Chilli Powder") == "0904"
    assert TaxCalculationService.get_commodity_hsn("Green Cardamom Pods") == "0908"
    assert TaxCalculationService.get_commodity_hsn("Non-Basmati White Rice") == "1006"
    assert TaxCalculationService.get_commodity_hsn("Black Pepper") == "0904"
    assert TaxCalculationService.get_commodity_hsn("Sesame Seeds (Till)") == "1207"


def test_invoice_builder_resilience():
    """Verify InvoiceBuilder gracefully handles invalid/non-numeric quantities and UTF-8 multibyte strings."""
    # 1. Invalid / malformed quantity handling
    bad_qty_orders = [
        {"id": "DOM-INV-ERR1", "consigneeName": "Ramesh", "commodity": "Moong", "amount": 200.0, "quantity": "invalid_qty"},
        {"id": "DOM-INV-ERR2", "consigneeName": "Suresh", "commodity": "Moong", "amount": 200.0, "quantity": None},
        {"id": "DOM-INV-ERR3", "consigneeName": "Mahesh", "commodity": "Moong", "amount": 200.0, "quantity": -5},
        {"id": "DOM-INV-ERR4", "consigneeName": "Dinesh", "commodity": "Moong", "amount": 200.0, "quantity": 0},
    ]

    for ord_dict in bad_qty_orders:
        builder = InvoiceBuilder(ord_dict)
        items_html = builder.build_items_table()
        assert "Moong" in items_html
        payload = builder.build_payload()
        assert payload["success"] is True
        assert payload["item"]["quantity"] == 1

    # 2. UTF-8 multibyte string support (Hindi & Indian scripts)
    hindi_order = {
        "id": "DOM-HI-01",
        "consigneeName": "राजेश कुमार शर्मा",
        "deliveryAddress": "४०२, नरीमन पॉइंट, मुंबई, महाराष्ट्र",
        "commodity": "शुद्ध देसी गाय का घी (बिलोना)",
        "amount": 950.0,
        "quantity": 1,
        "state": "Maharashtra"
    }
    hi_builder = InvoiceBuilder(hindi_order)
    hi_html = hi_builder.render_html()
    assert "राजेश कुमार शर्मा" in hi_html
    assert "शुद्ध देसी गाय का घी" in hi_html
    hi_payload = hi_builder.build_payload()
    assert hi_payload["consignee"]["name"] == "राजेश कुमार शर्मा"


def test_payment_strategy_factory_concurrency_and_aliases():
    """Verify PaymentStrategyFactory thread-safety under concurrent registration and alias lookups."""
    # 1. Alias Lookups
    assert isinstance(PaymentStrategyFactory.get_strategy("proforma_wire"), ProformaWireStrategy)
    assert isinstance(PaymentStrategyFactory.get_strategy("wire"), ProformaWireStrategy)
    assert isinstance(PaymentStrategyFactory.get_strategy("proforma"), ProformaWireStrategy)
    assert isinstance(PaymentStrategyFactory.get_strategy("freight"), FreightCollectStrategy)
    assert isinstance(PaymentStrategyFactory.get_strategy("b2b_freight"), FreightCollectStrategy)
    assert isinstance(PaymentStrategyFactory.get_strategy("mock_payment"), MockPaymentStrategy)

    # 2. Case variations in payload
    assert isinstance(PaymentStrategyFactory.get_strategy({"settlement_method": "freight_collect"}), FreightCollectStrategy)
    assert isinstance(PaymentStrategyFactory.get_strategy({"settlementMethod": "proforma_wire"}), ProformaWireStrategy)

    # 3. Concurrent Multi-threaded registration
    class DummyConcurrentStrategy(PaymentStrategy):
        def create_session(self, data, session): return {}
        def verify_settlement(self, data, request, session, background_tasks=None): return {}
        def handle_webhook(self, data, request, session, background_tasks=None): return {}
        def get_status(self, order_id, session): return {}

    errors = []
    def register_worker(worker_id):
        try:
            strat_name = f"dummy_strat_{worker_id}"
            PaymentStrategyFactory.register_strategy(strat_name, DummyConcurrentStrategy)
            resolved = PaymentStrategyFactory.get_strategy(strat_name)
            if not isinstance(resolved, DummyConcurrentStrategy):
                errors.append(f"Worker {worker_id} failed to resolve registered strategy")
        except Exception as ex:
            errors.append(f"Worker {worker_id} exception: {ex}")

    threads = [threading.Thread(target=register_worker, args=(i,)) for i in range(25)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0

    # Cleanup registered dummy strategies
    with PaymentStrategyFactory._lock:
        for i in range(25):
            PaymentStrategyFactory._registry.pop(f"dummy_strat_{i}", None)


def test_apm_metrics_subscriber_and_telemetry():
    """Verify APMMetricsSubscriber accurately aggregates domain event metrics."""
    subscriber = APMMetricsSubscriber()
    publisher = DomainEventPublisher()
    publisher.subscribe(subscriber)

    # Dispatch events
    publisher.publish(OrderPlacedEvent({"orderId": "ORD-APM-1", "amount": 100}))
    publisher.publish(DomesticPaymentVerifiedEvent({"orderId": "ORD-APM-1", "paymentId": "UTR-APM-1", "amount": 100}))
    publisher.publish(ConsignmentUpdatedEvent({"bl": "BL-APM-1", "stage": 2}))

    metrics = subscriber.get_metrics()
    assert metrics["totalEventsHandled"] == 3
    assert metrics["eventCounts"]["ORDER_PLACED"] == 1
    assert metrics["eventCounts"]["DOMESTIC_ORDER_PAID_UPI"] == 1
    assert metrics["eventCounts"]["CONSIGNMENT_UPDATED"] == 1
    assert metrics["lastEventName"] == "CONSIGNMENT_UPDATED"
    assert metrics["lastEventTime"] is not None

    # Global APM metrics helper
    global_metrics = get_apm_event_metrics()
    assert isinstance(global_metrics, dict)
    assert "totalEventsHandled" in global_metrics


def test_domain_services_delete_operations(db_session):
    """Verify ConsignmentService.delete_consignment and InquiryService.delete_inquiry domain logic."""
    # 1. ConsignmentService deletion
    test_bl = f"BL-DEL-{int(time.time())}"
    cons_repo = ConsignmentRepository(db_session)
    cons = ConsignmentModel(
        bl=test_bl,
        container="MSCU1122334",
        status="Stage 1: Manifest Created",
        commodity="Turmeric"
    )
    cons_repo.save(cons)
    db_session.commit()

    assert cons_repo.get_by_bl(test_bl) is not None
    deleted_cons = ConsignmentService.delete_consignment(test_bl, db_session)
    assert deleted_cons["success"] is True
    assert cons_repo.get_by_bl(test_bl) is None

    # Deleting non-existent consignment completes gracefully
    res_non_existent = ConsignmentService.delete_consignment("NON_EXISTENT_BL_999", db_session)
    assert res_non_existent["success"] is True

    # 2. InquiryService deletion
    test_inq_id = f"INQ-DEL-{int(time.time())}"
    inq_repo = InquiryRepository(db_session)
    inq = InquiryModel(
        id=test_inq_id,
        name="Test Inquirer",
        email="test@example.com",
        commodities="Chia Seeds"
    )
    inq_repo.save(inq)
    db_session.commit()

    assert inq_repo.get_by_id(test_inq_id) is not None
    deleted_inq = InquiryService.delete_inquiry(test_inq_id, db_session)
    assert deleted_inq["success"] is True
    assert inq_repo.get_by_id(test_inq_id) is None

    # Deleting non-existent inquiry completes gracefully
    res_non_exist_inq = InquiryService.delete_inquiry("NON_EXISTENT_INQ_999", db_session)
    assert res_non_exist_inq["success"] is True


def test_audit_verify_endpoint_and_batch_append(client, db_session):
    """Verify AuditRepository batch appending and GET /api/audit/verify endpoint response."""
    repo = AuditRepository(db_session)
    batch_entries = [
        {"action": "BATCH_EV_1", "entity_id": "BATCH-001", "details": "Batch entry 1"},
        {"action": "BATCH_EV_2", "entity_id": "BATCH-002", "details": "Batch entry 2"},
    ]
    appended = repo.append_batch(batch_entries, default_operator="Audit Tester")
    db_session.commit()
    assert len(appended) == 2
    assert appended[1].prev_hash == appended[0].hash

    # Authenticate and test /api/audit/verify endpoint
    token_resp = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_PASSWORD
    })
    assert token_resp.status_code == 200
    token = token_resp.json()["token"]

    verify_resp = client.get("/api/audit/verify", headers={"Authorization": f"Bearer {token}"})
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["success"] is True
    assert "valid" in data
    assert "status" in data
    assert data["algorithm"] == "SHA-256 Chronological Digest Chain"
    assert data["totalEntries"] >= 2

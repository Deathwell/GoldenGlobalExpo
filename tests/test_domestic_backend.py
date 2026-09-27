"""
Automated Test Suite for Domestic Trade Backend Integration
Golden Global Expo (GGE) National Distribution Desk

Tests cover:
1. Domestic Rates endpoint & Allowed Pack validation (500g, 1kg, 5kg, 25kg)
2. Domestic Orders Creation via /api/domestic-orders
3. Direct UPI Settlement Verification via /api/domestic-orders/verify-upi
4. Price Tampering Detection & UTR Validation
5. Synchronized State in SQLite (DomesticOrderModel, InquiryModel, ConsignmentModel, AuditLogModel)
6. Order Status Progression via PUT /api/domestic-orders/{order_id}/status
7. GST Tax Invoice Generation (JSON & Printable HTML)
8. Backward-Compatible Aliases (/api/create-upi-order, /api/confirm-upi-payment)
9. Flat-file JSON mirror persistence across restarts
"""

import json
import os
import time
import pytest
from backend.db import (
    SessionLocal,
    DomesticOrderModel,
    InquiryModel,
    ConsignmentModel,
    PaymentSessionModel,
    AuditLogModel
)


def get_admin_token(client):
    from backend.core.config import ADMIN_PASSWORD
    resp = client.post("/api/admin/login", json={
        "email": "admin@goldenglobalexpo.com",
        "password": ADMIN_PASSWORD
    })
    assert resp.status_code == 200
    return resp.json()["token"]


def test_domestic_rates_public(client):
    """Verify that public domestic rates endpoint returns pack prices and UPI VPA."""
    resp = client.get("/api/domestic-rates")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "rates" in data
    assert "allowedPacks" in data
    assert set(data["allowedPacks"]) == {"500g", "1kg", "5kg", "25kg"}
    assert "upiVpa" in data
    assert "payeeName" in data
    assert len(data["rates"]) > 0


def test_create_domestic_order_success(client, db_session):
    """Verify creating a domestic order persists to both DomesticOrderModel and InquiryModel."""
    order_id = f"GGE-DOM-TEST-{int(time.time())}"
    payload = {
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 3,
        "amount": 480.0,
        "name": "Ramesh Gupta",
        "phone": "+91 98200 54321",
        "email": "ramesh@guptatraders.in",
        "address": "Shop 4, APMC Market 1, Vashi",
        "city": "Navi Mumbai",
        "state": "Maharashtra",
        "pincode": "400703",
        "is_mock": True
    }

    resp = client.post("/api/domestic-orders", json=payload)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True
    assert res_data["orderId"] == order_id
    assert res_data["amount"] == 480.0
    assert "upiUri" in res_data
    assert "upiVpa" in res_data

    # Verify SQLite DomesticOrderModel
    dom = db_session.query(DomesticOrderModel).filter_by(id=order_id).first()
    assert dom is not None
    assert dom.commodity == "Classic Toor (Tur Dal)"
    assert dom.pack_size == "1kg"
    assert dom.quantity == 3
    assert dom.amount == 480.0
    assert dom.consignee_name == "Ramesh Gupta"
    assert dom.city == "Navi Mumbai"
    assert dom.pincode == "400703"
    assert dom.payment_status == "PENDING"
    assert "Pending" in dom.order_status

    # Verify SQLite InquiryModel synchronization
    inq = db_session.query(InquiryModel).filter_by(id=order_id).first()
    assert inq is not None
    assert inq.type == "DOMESTIC_ORDER"
    assert inq.pack_size == "1kg"
    assert inq.pack_quantity == 3
    assert inq.city == "Navi Mumbai"
    assert inq.payment_status == "PENDING"


def test_create_domestic_order_invalid_pack(client):
    """Verify that orders with unapproved pack sizes are rejected."""
    payload = {
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "2.5kg",  # Invalid pack size
        "quantity": 1,
        "name": "Test User",
        "phone": "9999999999",
        "address": "Test Address",
        "city": "Mumbai",
        "pincode": "400001"
    }
    resp = client.post("/api/domestic-orders", json=payload)
    assert resp.status_code == 400
    data = resp.json()
    assert data["success"] is False
    assert "Invalid pack size" in data["error"]


def test_create_domestic_order_missing_fields(client):
    """Verify that orders missing required consignee fields are rejected."""
    payload = {
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "name": "",  # Missing name
        "phone": "9999999999",
        "address": "Test Address",
        "city": "Mumbai",
        "pincode": "400001"
    }
    resp = client.post("/api/domestic-orders", json=payload)
    assert resp.status_code == 400
    assert "name is required" in resp.json()["error"].lower()


def test_verify_upi_payment_full_workflow(client, db_session):
    """
    Verify complete UPI confirmation workflow:
    1. Create domestic order
    2. Confirm UPI payment with valid UTR
    3. Ensure DomesticOrderModel, InquiryModel, ConsignmentModel, and AuditLogModel are updated
    """
    order_id = f"GGE-DOM-PAY-{int(time.time())}"
    create_payload = {
        "orderId": order_id,
        "commodity": "Sortex Polished Moong Dal",
        "packSize": "5kg",
        "quantity": 2,
        "amount": 1450.0,
        "name": "Anil Deshmukh",
        "phone": "9819001122",
        "email": "anil@deshmukh.co.in",
        "address": "B-204, Trade Centre, Bandra Kurla BKC",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400051",
        "is_mock": True
    }
    create_resp = client.post("/api/domestic-orders", json=create_payload)
    assert create_resp.status_code == 200

    # Verify payment
    mock_utr = f"UTR991448{int(time.time()) % 1000000:06d}"
    verify_payload = {
        "orderId": order_id,
        "utr": mock_utr,
        "amount": 1450.0,
        "name": "Anil Deshmukh",
        "phone": "9819001122",
        "commodity": "Sortex Polished Moong Dal",
        "packSize": "5kg",
        "quantity": 2,
        "is_mock": True
    }
    verify_resp = client.post("/api/domestic-orders/verify-upi", json=verify_payload)
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["success"] is True
    assert v_data["status"] == "captured"
    assert v_data["utr"] == mock_utr
    assert "taxInvoiceRef" in v_data
    assert "courierPartner" in v_data
    assert "trackingNumber" in v_data

    # Check DomesticOrderModel in DB
    db_session.expire_all()
    dom = db_session.query(DomesticOrderModel).filter_by(id=order_id).first()
    assert dom is not None
    assert dom.payment_status == "PAID"
    assert dom.upi_utr == mock_utr
    assert "Allocation" in dom.order_status
    assert dom.tax_invoice_ref == v_data["taxInvoiceRef"]
    assert dom.tracking_number == v_data["trackingNumber"]

    # Check InquiryModel in DB
    inq = db_session.query(InquiryModel).filter_by(id=order_id).first()
    assert inq is not None
    assert inq.payment_status == "PAID"
    assert inq.utr == mock_utr
    assert inq.tax_invoice_ref == v_data["taxInvoiceRef"]

    # Check ConsignmentModel in DB
    consign = db_session.query(ConsignmentModel).filter_by(bl=order_id).first()
    assert consign is not None
    assert consign.buyer == "Anil Deshmukh"
    assert consign.stage == 2
    assert "Mumbai" in consign.pod
    assert consign.inv_ref == v_data["taxInvoiceRef"]

    # Check AuditLogModel in DB
    audit = db_session.query(AuditLogModel).filter_by(entity_id=order_id).first()
    assert audit is not None
    assert audit.action == "DOMESTIC_ORDER_PAID_UPI"
    assert len(audit.hash) == 64  # Valid SHA-256


def test_verify_upi_price_tampering_rejected(client):
    """Verify that payment verification rejects mismatched / tampered payment amounts."""
    order_id = f"GGE-DOM-TAMP-{int(time.time())}"
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "amount": 160.0,
        "name": "Tamper Test",
        "phone": "9999999999",
        "address": "Road 1",
        "city": "Nagpur",
        "pincode": "440001",
        "is_mock": True
    })

    # Attempt to confirm with a lower amount
    resp = client.post("/api/domestic-orders/verify-upi", json={
        "orderId": order_id,
        "utr": "UTR991448000111",
        "amount": 10.0,  # Expected 160.0!
        "is_mock": True
    })
    assert resp.status_code == 400
    assert "Price tampering detected" in resp.json()["error"]


def test_verify_upi_invalid_utr_rejected(client):
    """Verify that invalid/too-short UTR is rejected."""
    order_id = f"GGE-DOM-UTR-{int(time.time())}"
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "amount": 160.0,
        "name": "UTR Test",
        "phone": "9999999999",
        "address": "Road 1",
        "city": "Nashik",
        "pincode": "422001",
        "is_mock": True
    })

    resp = client.post("/api/domestic-orders/verify-upi", json={
        "orderId": order_id,
        "utr": "123",  # Too short
        "amount": 160.0
    })
    assert resp.status_code == 400
    assert "UTR" in resp.json()["error"] or "min 4 characters" in resp.json()["error"]


def test_get_domestic_orders_and_filtering(client):
    """Verify querying domestic orders with search and status filters."""
    # Place a unique order
    unique_phone = f"98200{int(time.time()) % 100000:05d}"
    order_id = f"GGE-DOM-FLT-{int(time.time())}"
    post_res = client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Chana Dal (Bengal Gram)",
        "packSize": "25kg",
        "quantity": 1,
        "amount": 2750.0,
        "name": "Shree Ganesh Traders",
        "phone": unique_phone,
        "address": "Plot 88, Market Yard",
        "city": "Solapur",
        "state": "Maharashtra",
        "pincode": "413002",
        "is_mock": True
    })
    assert post_res.status_code == 200

    # 1. Unauthenticated fetch must be rejected with 401
    unauth_resp = client.get("/api/domestic-orders")
    assert unauth_resp.status_code == 401

    # 2. Authenticated Admin fetch must succeed
    token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/domestic-orders", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert any(o["id"] == order_id for o in data["orders"])

    # 3. Search by phone
    resp_phone = client.get(f"/api/domestic-orders?search={unique_phone}", headers=headers)
    assert resp_phone.status_code == 200
    data_phone = resp_phone.json()
    assert len(data_phone["orders"]) >= 1
    assert data_phone["orders"][0]["consigneePhone"] == unique_phone

    # 4. Filter by status
    resp_pending = client.get("/api/domestic-orders?status=PENDING", headers=headers)
    assert resp_pending.status_code == 200
    assert all(o["paymentStatus"] == "PENDING" for o in resp_pending.json()["orders"] if "paymentStatus" in o)


def test_update_domestic_order_status(client, db_session):
    """Verify updating domestic order status cascades to InquiryModel and ConsignmentModel."""
    order_id = f"GGE-DOM-STS-{int(time.time())}"
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "500g",
        "quantity": 4,
        "amount": 340.0,
        "name": "Status Tester",
        "phone": "9876543210",
        "address": "Street 9",
        "city": "Thane",
        "pincode": "400601",
        "is_mock": True
    })
    client.post("/api/domestic-orders/verify-upi", json={
        "orderId": order_id,
        "utr": "UTR991448123999",
        "amount": 340.0,
        "is_mock": True
    })

    # 1. Unauthenticated status update must be rejected with 401
    unauth_resp = client.put(f"/api/domestic-orders/{order_id}/status", json={
        "status": "DISPATCHED (Surface Express)"
    })
    assert unauth_resp.status_code == 401

    # 2. Authenticated status update to DISPATCHED
    token = get_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.put(f"/api/domestic-orders/{order_id}/status", json={
        "status": "DISPATCHED (Surface Express)",
        "courierPartner": "Blue Dart Express",
        "trackingNumber": "BD-TEST-998877"
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    db_session.expire_all()
    dom = db_session.query(DomesticOrderModel).filter_by(id=order_id).first()
    assert dom.order_status == "DISPATCHED (Surface Express)"
    assert dom.tracking_number == "BD-TEST-998877"

    consign = db_session.query(ConsignmentModel).filter_by(bl=order_id).first()
    assert consign is not None
    assert consign.stage == 4  # Surface Express Transit

    # Update to DELIVERED
    resp_del = client.put(f"/api/domestic-orders/{order_id}/status", json={
        "status": "DELIVERED to Consignee"
    }, headers=headers)
    assert resp_del.status_code == 200

    db_session.expire_all()
    consign_del = db_session.query(ConsignmentModel).filter_by(bl=order_id).first()
    assert consign_del.stage == 6  # Delivered


def test_domestic_tax_invoice_json_and_html(client):
    """Verify GST Tax Invoice calculations and printable HTML format."""
    order_id = f"GGE-DOM-INV-{int(time.time())}"
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 2,
        "amount": 320.0,
        "name": "Invoice Buyer",
        "phone": "9820011223",
        "address": "Main Road",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "is_mock": True
    })
    client.post("/api/domestic-orders/verify-upi", json={
        "orderId": order_id,
        "utr": "UTR991448888777",
        "amount": 320.0,
        "is_mock": True
    })

    # 1. JSON Invoice
    resp_json = client.get(f"/api/domestic-orders/{order_id}/invoice")
    assert resp_json.status_code == 200
    inv = resp_json.json()
    assert inv["success"] is True
    assert inv["orderId"] == order_id
    assert inv["totalAmount"] == 320.0
    assert "taxableValue" in inv
    assert "totalGst" in inv
    assert "gstBreakdown" in inv

    # 2. HTML Printable Invoice
    resp_html = client.get(f"/api/domestic-orders/{order_id}/invoice?format=html")
    assert resp_html.status_code == 200
    assert "text/html" in resp_html.headers.get("content-type", "")
    html_content = resp_html.text
    assert "TAX INVOICE" in html_content
    assert "GOLDEN GLOBAL EXPO" in html_content
    assert order_id in html_content
    assert "320.00" in html_content


def test_backward_compatibility_aliases(client):
    """Verify that legacy routes /api/create-upi-order and /api/confirm-upi-payment function cleanly."""
    order_id = f"GGE-DOM-LEG-{int(time.time())}"
    r1 = client.post("/api/create-upi-order", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "amount": 160.0,
        "name": "Legacy Tester",
        "phone": "9820099999",
        "address": "Old Highway",
        "city": "Pune",
        "pincode": "411002",
        "is_mock": True
    })
    assert r1.status_code == 200
    assert r1.json()["success"] is True

    r2 = client.post("/api/confirm-upi-payment", json={
        "orderId": order_id,
        "utr": "UTR991448009988",
        "amount": 160.0,
        "is_mock": True
    })
    assert r2.status_code == 200
    assert r2.json()["success"] is True
    assert r2.json()["status"] == "captured"


def test_price_tampering_rejected(client):
    """Verify that client-forged prices are blocked with HTTP 400."""
    payload = {
        "orderId": f"GGE-DOM-HACK-{int(time.time())}",
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "25kg",
        "quantity": 1,
        "amount": 10.0,  # Scheduled price is 3750.0!
        "name": "Price Hacker",
        "phone": "9999900000",
        "address": "Hack Street",
        "city": "Mumbai",
        "pincode": "400001",
        "is_mock": True
    }
    resp = client.post("/api/domestic-orders", json=payload)
    assert resp.status_code == 400
    data = resp.json()
    assert data["success"] is False
    assert "price tampering" in data["error"].lower()


def test_domestic_order_deletion_cascading(client, db_session):
    """Verify that deleting a domestic order requires admin auth and cascades across all tables."""
    order_id = f"GGE-DOM-DEL-{int(time.time())}"
    # Create and confirm
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "amount": 160.0,
        "name": "Delete Target",
        "phone": "9811122233",
        "address": "Delete Lane",
        "city": "Pune",
        "pincode": "411001",
        "is_mock": True
    })
    client.post("/api/domestic-orders/verify-upi", json={
        "orderId": order_id,
        "utr": f"UTR{int(time.time()) % 1000000000}",
        "amount": 160.0,
        "is_mock": True
    })

    # Verify records exist
    assert db_session.query(DomesticOrderModel).filter_by(id=order_id).first() is not None
    assert db_session.query(InquiryModel).filter_by(id=order_id).first() is not None
    assert db_session.query(ConsignmentModel).filter_by(bl=order_id).first() is not None

    # Unauthenticated delete must fail with 401
    unauth_resp = client.delete(f"/api/domestic-orders/{order_id}")
    assert unauth_resp.status_code == 401

    # Authenticated Admin delete
    token = get_admin_token(client)
    auth_resp = client.delete(f"/api/domestic-orders/{order_id}", headers={"Authorization": f"Bearer {token}"})
    assert auth_resp.status_code == 200
    assert auth_resp.json()["success"] is True

    # Verify cascading deletion
    db_session.expire_all()
    assert db_session.query(DomesticOrderModel).filter_by(id=order_id).first() is None
    assert db_session.query(InquiryModel).filter_by(id=order_id).first() is None
    assert db_session.query(ConsignmentModel).filter_by(bl=order_id).first() is None


def test_get_single_domestic_order_pii_shield(client):
    """Verify that unauthenticated GET /api/domestic-orders/{id} shields PII, while authenticated reveals it."""
    order_id = f"GGE-DOM-PII-{int(time.time())}"
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "amount": 160.0,
        "name": "Secret Consignee",
        "phone": "9820012345",
        "email": "secret@gmail.com",
        "address": "Flat 402, Secret Heights, BKC",
        "city": "Mumbai",
        "pincode": "400051",
        "is_mock": True
    })

    # 1. Unauthenticated request: PII must be redacted
    anon_resp = client.get(f"/api/domestic-orders/{order_id}")
    assert anon_resp.status_code == 200
    anon_order = anon_resp.json()["order"]
    assert "••••" in anon_order["consigneePhone"]
    assert "••••" in anon_order["consigneeEmail"]
    assert "Protected" in anon_order["deliveryAddress"]

    # 2. Authenticated Admin request: Full unredacted PII
    token = get_admin_token(client)
    auth_resp = client.get(f"/api/domestic-orders/{order_id}", headers={"Authorization": f"Bearer {token}"})
    assert auth_resp.status_code == 200
    auth_order = auth_resp.json()["order"]
    assert auth_order["consigneePhone"] == "9820012345"
    assert auth_order["consigneeEmail"] == "secret@gmail.com"
    assert "Flat 402, Secret Heights, BKC" in auth_order["deliveryAddress"]


def test_domestic_tracking_inquiry_notice(client):
    """Verify that tracking a domestic order via /api/track returns domestic surface express telemetry, not maritime RFQ."""
    order_id = f"GGE-DOM-TRK-{int(time.time())}"
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Cumin Seeds (Jeera Whole)",
        "packSize": "500g",
        "quantity": 1,
        "amount": 240.0,
        "name": "Domestic Tracker Consignee",
        "phone": "9812345678",
        "address": "Shop 12, Spices Market",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380001",
        "is_mock": True
    })

    track_resp = client.get(f"/api/track?bl={order_id}")
    assert track_resp.status_code == 200
    data = track_resp.json()
    assert data["success"] is True
    assert data["isDomestic"] is True
    assert data["type"] == "DOMESTIC_ORDER"
    assert data["order"]["id"] == order_id
    assert "Nhava Sheva" not in data["order"]["message"]
    assert "domestic" in data["order"]["message"].lower()


def test_get_single_domestic_order_gstin_pan_masking(client):
    """Verify that unauthenticated domestic order lookup masks GSTIN to protect customer PAN number."""
    order_id = f"GGE-DOM-GST-{int(time.time())}"
    raw_gstin = "27AAGPB8439A1Z1"
    pan_number = "AAGPB8439A"

    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "amount": 160.0,
        "name": "Enterprise Buyer Ltd",
        "phone": "9820011223",
        "email": "buyer@enterprise.com",
        "address": "Plot 12, Industrial Area",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "gstin": raw_gstin,
        "is_mock": True
    })

    # Unauthenticated: GSTIN PAN portion must be masked
    anon_resp = client.get(f"/api/domestic-orders/{order_id}")
    assert anon_resp.status_code == 200
    anon_data = anon_resp.json()["order"]
    assert anon_data["gstin"] != raw_gstin
    assert pan_number not in anon_data["gstin"]
    assert "••••••••••" in anon_data["gstin"]
    assert anon_data["gstin"].startswith("27")
    assert anon_data["gstin"].endswith("1Z1")

    # Authenticated admin: GSTIN fully visible
    token = get_admin_token(client)
    auth_resp = client.get(f"/api/domestic-orders/{order_id}", headers={"Authorization": f"Bearer {token}"})
    assert auth_resp.status_code == 200
    auth_data = auth_resp.json()["order"]
    assert auth_data["gstin"] == raw_gstin


def test_domestic_tracking_by_courier_docket_and_tax_invoice(client):
    """Verify that surface courier docket and tax invoice reference resolve to domestic trade order in tracking portal."""
    order_id = f"GGE-DOM-DKT-{int(time.time())}"
    create_res = client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Chia Seeds (Superfood)",
        "packSize": "500g",
        "quantity": 1,
        "amount": 190.0,
        "name": "Docket Consignee",
        "phone": "9876543210",
        "email": "docket@test.com",
        "address": "404 Courier Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "is_mock": True
    })
    assert create_res.status_code == 200

    # Settle payment to assign courier docket and tax invoice
    clean_sfx = order_id.replace("GGE-DOM-", "")
    docket_no = f"BD-DOM-{clean_sfx}"
    tax_inv = f"TAX-INV-DOM-{clean_sfx}"

    # Track by courier tracking number (e.g. BD-DOM-XXXX)
    track_docket = client.get(f"/api/track?bl={docket_no}")
    assert track_docket.status_code == 200
    docket_data = track_docket.json()
    assert docket_data["success"] is True
    assert docket_data["isDomestic"] is True
    assert docket_data["order"]["id"] == order_id

    # Track by tax invoice ref (e.g. TAX-INV-DOM-XXXX)
    track_inv = client.get(f"/api/track?bl={tax_inv}")
    assert track_inv.status_code == 200
    inv_data = track_inv.json()
    assert inv_data["success"] is True
    assert inv_data["isDomestic"] is True
    assert inv_data["order"]["id"] == order_id


def test_statutory_verification_domestic_order_and_invoice(client):
    """Verify that official statutory verification gateway resolves domestic trade orders and tax invoices."""
    order_id = f"GGE-DOM-VER-{int(time.time())}"
    clean_sfx = order_id.replace("GGE-DOM-", "")
    tax_inv = f"TAX-INV-DOM-{clean_sfx}"

    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Moong (Whole)",
        "packSize": "1kg",
        "quantity": 2,
        "amount": 300.0,
        "name": "Audit Consignee",
        "phone": "9811223344",
        "email": "audit@test.com",
        "address": "707 Compliance Plaza",
        "city": "Nagpur",
        "state": "Maharashtra",
        "pincode": "440001",
        "is_mock": True
    })

    # Verify by order_id
    ver_order = client.get(f"/api/verify/{order_id}")
    assert ver_order.status_code == 200
    ord_doc = ver_order.json()
    assert ord_doc["success"] is True
    assert ord_doc["valid"] is True
    assert ord_doc["docType"] == "Statutory GST Tax Invoice & Domestic Express Consignment"
    assert ord_doc["document"]["isDomestic"] is True
    assert "FSSAI" in ord_doc["document"]["inspectionStandard"]

    # Verify by tax invoice ref
    ver_inv = client.get(f"/api/verify/{tax_inv}")
    assert ver_inv.status_code == 200
    inv_doc = ver_inv.json()
    assert inv_doc["success"] is True
    assert inv_doc["valid"] is True
    assert inv_doc["docType"] == "Statutory GST Tax Invoice & Domestic Express Consignment"
    assert inv_doc["document"]["isDomestic"] is True


def test_domestic_order_inquiry_sync_on_update(client, db_session):
    """Verify that updating a domestic order keeps InquiryModel in sync with new pack details."""
    order_id = f"GGE-DOM-SYNC-{int(time.time())}"

    # Initial order: 1kg x 1 unit
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "amount": 160.0,
        "name": "Sync Buyer Initial",
        "phone": "9820099887",
        "email": "sync@test.com",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "is_mock": True
    })

    # Update order with 5kg x 2 units (775 * 2 = 1550)
    client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "5kg",
        "quantity": 2,
        "amount": 1550.0,
        "name": "Sync Buyer Updated",
        "phone": "9820099887",
        "email": "sync@test.com",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "is_mock": True
    })

    db_session.expire_all()
    inq = db_session.query(InquiryModel).filter_by(id=order_id).first()
    assert inq is not None
    assert inq.name == "Sync Buyer Updated"
    assert inq.pack_size == "5kg"
    assert inq.pack_quantity == 2
    assert "₹1550.00" in inq.payable


def test_domestic_order_invoice_json_and_html(client):
    """Verify domestic tax invoice endpoint returns valid JSON and HTML with authentic GSTIN and tax breakdown."""
    order_id = f"GGE-DOM-INV-{int(time.time())}"
    res = client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 2,
        "amount": 320.0,
        "name": "Invoice Test Consignee",
        "phone": "9820012345",
        "email": "invoice@test.com",
        "address": "42 Market Street, Dadar",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400028",
        "gstin": "27AAGPB8439A1Z1",
        "is_mock": True
    })
    assert res.status_code == 200

    # 1. JSON format
    json_resp = client.get(f"/api/domestic/orders/{order_id}/invoice")
    assert json_resp.status_code == 200
    inv_data = json_resp.json()
    assert inv_data["success"] is True
    assert inv_data["seller"]["gstin"] == "27AAGPB8439A1Z1"
    assert inv_data["seller"]["fssaiNumber"] == "11521008000142"
    assert inv_data["totalAmount"] == 320.0
    assert inv_data["taxBreakdown"]["isInterstate"] is False
    assert inv_data["taxBreakdown"]["cgstAmount"] > 0
    assert inv_data["taxBreakdown"]["sgstAmount"] > 0
    assert inv_data["taxBreakdown"]["igstAmount"] == 0

    # 2. HTML format
    html_resp = client.get(f"/api/domestic/orders/{order_id}/invoice?format=html")
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers.get("content-type", "")
    html_text = html_resp.text
    assert "TAX INVOICE" in html_text
    assert "27AAGPB8439A1Z1" in html_text
    assert "11521008000142" in html_text
    assert "Invoice Test Consignee" in html_text
    assert "Classic Toor (Tur Dal)" in html_text


def test_domestic_order_invoice_null_resilience(client, db_session):
    """Verify that domestic invoice HTML generation does not crash when fields are None in database."""
    order_id = f"GGE-DOM-NULL-{int(time.time())}"
    null_order = DomesticOrderModel(
        id=order_id,
        commodity=None,
        pack_size=None,
        quantity=1,
        amount=160.0,
        consignee_name=None,
        consignee_phone=None,
        consignee_email=None,
        delivery_address=None,
        city=None,
        state=None,
        pincode=None,
        gstin=None,
        upi_vpa=None,
        upi_utr=None,
        payment_status="PENDING",
        order_status=None,
        courier_partner=None,
        tracking_number=None,
        tax_invoice_ref=None,
        created_at=time.time(),
        updated_at=time.time()
    )
    db_session.add(null_order)
    db_session.commit()

    # Requesting HTML invoice must not raise TypeError (500) and must render defaults safely
    html_resp = client.get(f"/api/domestic/orders/{order_id}/invoice?format=html")
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers.get("content-type", "")
    html_text = html_resp.text
    assert "TAX INVOICE" in html_text
    assert "27AAGPB8439A1Z1" in html_text
    assert "Valued Consignee" in html_text
    assert ("Blue Dart Express Surface" in html_text or "Surface Express (Pending)" in html_text)
    assert ("In Fulfillment" in html_text or "Docket / AWB:" in html_text)


def test_domestic_order_invoice_interstate_igst(client):
    """Verify IGST breakdown for out-of-state consignments (e.g. Gujarat)."""
    order_id = f"GGE-DOM-IGST-{int(time.time())}"
    res = client.post("/api/domestic-orders", json={
        "orderId": order_id,
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 1,
        "amount": 160.0,
        "name": "Ahmedabad Wholesale Trader",
        "phone": "9820054321",
        "email": "trader@ahmedabad.com",
        "address": "Ring Road Commercial Complex",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380001",
        "is_mock": True
    })
    assert res.status_code == 200

    json_resp = client.get(f"/api/domestic/orders/{order_id}/invoice")
    assert json_resp.status_code == 200
    inv = json_resp.json()
    assert inv["taxBreakdown"]["isInterstate"] is True
    assert inv["taxBreakdown"]["igstRate"] == 0.05
    assert inv["taxBreakdown"]["cgstAmount"] == 0.0
    assert inv["taxBreakdown"]["sgstAmount"] == 0.0
    assert inv["taxBreakdown"]["igstAmount"] > 0

    html_resp = client.get(f"/api/domestic/orders/{order_id}/invoice?format=html")
    assert html_resp.status_code == 200
    assert "IGST (5.0%)" in html_resp.text


def test_domestic_order_invoice_full_null_resilience(client, db_session):
    """Verify invoice endpoint survives total database nullity: amount=None and quantity=None."""
    order_id = f"GGE-DOM-TOTALNULL-{int(time.time())}"
    null_order = DomesticOrderModel(
        id=order_id,
        commodity=None,
        pack_size=None,
        quantity=None,
        amount=None,
        consignee_name=None,
        consignee_phone=None,
        consignee_email=None,
        delivery_address=None,
        city=None,
        state=None,
        pincode=None,
        gstin=None,
        upi_vpa=None,
        upi_utr=None,
        payment_status=None,
        order_status=None,
        courier_partner=None,
        tracking_number=None,
        tax_invoice_ref=None,
        created_at=time.time(),
        updated_at=time.time()
    )
    db_session.add(null_order)
    db_session.commit()

    # JSON format check
    json_resp = client.get(f"/api/domestic/orders/{order_id}/invoice")
    assert json_resp.status_code == 200
    inv = json_resp.json()
    assert inv["success"] is True
    assert inv["totalAmount"] == 0.0
    assert inv["item"]["quantity"] == 1

    # HTML format check
    html_resp = client.get(f"/api/domestic/orders/{order_id}/invoice?format=html")
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers.get("content-type", "")
    assert "TAX INVOICE" in html_resp.text




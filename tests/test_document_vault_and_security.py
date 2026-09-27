"""
Unit & Integration Tests for Trade Document Vault, Magic Byte Validation,
Directory Traversal Defenses, and Incoterms Proforma Engine.
"""

import os
import io
import time
import pytest
from starlette.testclient import TestClient
from backend.app import app
from backend.core.config import BASE_DIR
from backend.db import SessionLocal, AdminSessionModel, ConsignmentModel


@pytest.fixture
def admin_headers():
    session = SessionLocal()
    token = "test_vault_admin_token_2026"
    try:
        session.query(AdminSessionModel).filter_by(token=token).delete()
        admin_session = AdminSessionModel(
            token=token,
            email="admin@goldenglobalexpo.com",
            role="admin",
            created_at=time.time(),
            expires_at=time.time() + 3600
        )
        session.add(admin_session)
        session.commit()
    finally:
        session.close()

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def logistics_headers():
    session = SessionLocal()
    token = "test_vault_logistics_token_2026"
    try:
        session.query(AdminSessionModel).filter_by(token=token).delete()
        log_session = AdminSessionModel(
            token=token,
            email="logistics@goldenglobalexpo.com",
            role="logistics",
            created_at=time.time(),
            expires_at=time.time() + 3600
        )
        session.add(log_session)
        session.commit()
    finally:
        session.close()

    return {"Authorization": f"Bearer {token}"}


# ================= 1. AUTHENTICATION & ACCESS CONTROL TESTS =================

def test_document_upload_unauthenticated_rejected(client):
    """Anonymous visitors cannot upload official trade documents."""
    fake_pdf = b"%PDF-1.4 Fake valid PDF content for unit test payload"
    files = {"file": ("test.pdf", io.BytesIO(fake_pdf), "application/pdf")}
    data = {"bl": "GGE-JNPT-2026", "slot": "coa"}

    resp = client.post("/api/documents/upload", files=files, data=data)
    assert resp.status_code == 401
    assert "Authentication required" in resp.json()["detail"]


def test_document_delete_unauthenticated_rejected(client):
    """Anonymous visitors cannot delete official trade documents."""
    resp = client.delete("/api/documents/GGE-JNPT-2026/coa")
    assert resp.status_code == 401


# ================= 2. FILE TYPE & MAGIC BYTE DEFENSES =================

def test_document_upload_disallowed_extension_rejected(client, admin_headers):
    """Dangerous executable / script extensions are rejected."""
    files = {"file": ("malware.exe", io.BytesIO(b"MZ\x90\x00BinaryExeCodeHere"), "application/octet-stream")}
    data = {"bl": "GGE-JNPT-2026", "slot": "inv"}

    resp = client.post("/api/documents/upload", files=files, data=data, headers=admin_headers)
    assert resp.status_code == 400
    assert "not allowed" in resp.json()["detail"]


def test_document_upload_pdf_magic_byte_validation(client, admin_headers):
    """A .pdf file missing the %PDF- header is rejected as an invalid/polyglot payload."""
    corrupted_data = b"THIS IS NOT A VALID PDF FILE HEADER CONTENT"
    files = {"file": ("document.pdf", io.BytesIO(corrupted_data), "application/pdf")}
    data = {"bl": "GGE-JNPT-2026", "slot": "inv"}

    resp = client.post("/api/documents/upload", files=files, data=data, headers=admin_headers)
    assert resp.status_code == 400
    assert "Missing %PDF- signature" in resp.json()["detail"]


def test_document_upload_png_magic_byte_validation(client, admin_headers):
    """A .png file missing the PNG magic header is rejected."""
    fake_png = b"NOT_A_REAL_PNG_SIGNATURE_CONTENT"
    files = {"file": ("scan.png", io.BytesIO(fake_png), "image/png")}
    data = {"bl": "GGE-JNPT-2026", "slot": "coa"}

    resp = client.post("/api/documents/upload", files=files, data=data, headers=admin_headers)
    assert resp.status_code == 400
    assert "Missing PNG signature" in resp.json()["detail"]


def test_document_upload_jpg_magic_byte_validation(client, admin_headers):
    """A .jpg file missing JPEG SOI marker is rejected."""
    fake_jpg = b"NOT_A_REAL_JPEG_HEADER"
    files = {"file": ("scan.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
    data = {"bl": "GGE-JNPT-2026", "slot": "phyto"}

    resp = client.post("/api/documents/upload", files=files, data=data, headers=admin_headers)
    assert resp.status_code == 400
    assert "Missing JPEG signature" in resp.json()["detail"]


# ================= 3. DIRECTORY TRAVERSAL & SLOT SANITIZATION =================

def test_document_upload_directory_traversal_sanitized(client, admin_headers):
    """Directory traversal sequences in BL or slot are completely sanitized."""
    valid_pdf = b"%PDF-1.5 Valid PDF Content 1234567890"
    files = {"file": ("sample.pdf", io.BytesIO(valid_pdf), "application/pdf")}
    data = {"bl": "../../etc/passwd", "slot": "coa"}

    resp = client.post("/api/documents/upload", files=files, data=data, headers=admin_headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True
    # Sanitized filename must not contain directory traversal slashes or relative paths
    assert ".." not in res_data["filename"]
    assert "/" not in res_data["filename"]
    assert "\\" not in res_data["filename"]


def test_document_upload_invalid_slot_rejected(client, admin_headers):
    """Document slots outside allowed enum (inv, phyto, coa, bl) are rejected."""
    valid_pdf = b"%PDF-1.4 Valid PDF payload for slot check"
    files = {"file": ("doc.pdf", io.BytesIO(valid_pdf), "application/pdf")}
    data = {"bl": "GGE-JNPT-2026", "slot": "arbitrary_unapproved_slot"}

    resp = client.post("/api/documents/upload", files=files, data=data, headers=admin_headers)
    assert resp.status_code == 400
    assert "Invalid document slot" in resp.json()["detail"]


# ================= 4. DOCUMENT RETRIEVAL & DOWNLOAD HEADERS =================

def test_document_download_non_existent_returns_structured_404(client):
    """Querying a non-existent document slot produces structured JSON."""
    resp = client.get("/api/documents/NON_EXISTENT_SHIPMENT/inv")
    assert resp.status_code == 404
    data = resp.json()
    assert data["success"] is False
    assert "error" in data


def test_document_metadata_endpoint(client):
    """Metadata endpoint returns status dictionary for all 4 standard trade slots."""
    resp = client.get("/api/documents/meta/GGE-JNPT-2026")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "documents" in data
    assert set(data["documents"].keys()) == {"inv", "phyto", "coa", "bl"}


# ================= 5. PROFORMA INVOICE & PACKING LIST BUILDERS =================

def test_proforma_invoice_builder_icc_incoterms():
    from backend.services.proforma_builder import ProformaInvoiceBuilder

    order_data = {
        "buyerCompany": "Al-Noor Foodstuff Trading LLC",
        "buyerName": "Tariq Al-Mansoor",
        "buyerAddress": "P.O. Box 8920, Dubai, United Arab Emirates",
        "buyerCountry": "United Arab Emirates",
        "destination": "Jebel Ali Port (AEJEA), Dubai",
        "incoterms": "CIF Jebel Ali Port (Incoterms 2020)",
        "currency": "USD",
        "items": [
            {
                "commodity": "Classic Toor (Tur Dal / Split Pigeon Pea)",
                "quantityMt": 24.0,
                "unitPriceUsd": 820.0,
                "packaging": "50 KG Bags in 20' FCL"
            }
        ],
        "freight": 1200.0,
        "insurance": 250.0
    }

    builder = ProformaInvoiceBuilder(order_data)
    d = builder.to_dict()

    assert d["documentType"] == "PROFORMA_INVOICE"
    assert d["buyer"]["company"] == "Al-Noor Foodstuff Trading LLC"
    assert d["buyer"]["name"] == "Tariq Al-Mansoor"
    assert d["subtotal"] == 24.0 * 820.0
    assert d["grandTotal"] == (24.0 * 820.0) + 1200.0 + 250.0
    assert len(d["securityHash"]) == 64

    html = builder.build_html()
    assert "PROFORMA INVOICE" in html
    assert "Al-Noor Foodstuff Trading LLC" in html
    assert "CIF Jebel Ali" in html


def test_packing_list_builder_calculations():
    from backend.services.proforma_builder import PackingListBuilder

    data = {
        "consigneeName": "SingaTrade Global Pte Ltd",
        "buyerName": "SingaTrade Global Pte Ltd",
        "consigneeAddress": "10 Jurong Port Rd, Singapore",
        "commodity": "Classic Chana Dal (Bengal Gram)",
        "totalBags": 960,
        "netWeightMt": 24.0,
        "grossWeightMt": 24.2,
        "container": "EGLV 901823-1",
        "sealNo": "GGE-SEAL-88912"
    }

    builder = PackingListBuilder(data)
    d = builder.to_dict()

    assert d["documentType"] == "COMMERCIAL_PACKING_LIST"
    assert d["totalBags"] == 960
    assert d["netWeightMt"] == 24.0
    assert d["grossWeightMt"] == 24.2
    assert d["tareWeightMt"] == pytest.approx(0.2, 0.01)
    assert d["containerNo"] == "EGLV 901823-1"

    html = builder.build_html()
    assert "COMMERCIAL PACKING LIST" in html
    assert "SingaTrade Global Pte Ltd" in html
    assert "EGLV 901823-1" in html

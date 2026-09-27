"""
Tests for API Contract & Runtime Schema Validation
Validates strict type-safety, boundaries, and payload sanitization across all external entrypoints.
"""

import pytest
from backend.core.schemas import (
    InquiryCreateSchema,
    DomesticOrderCreateSchema,
    DomesticOrderVerifyUpiSchema,
    CommoditySpecificationSchema,
    AuthLoginStep1Schema,
    AuthVerifyOtpSchema,
    HealthzResponseSchema,
    ReadyzResponseSchema,
    validate_schema
)


# ================= 1. INQUIRY SCHEMA CONTRACT TESTS =================

def test_inquiry_schema_valid_payload():
    valid = {
        "name": "Ahmad Al-Mansoor",
        "email": "ahmad@gulfagri.ae",
        "company": "Gulf Agri Trading",
        "commodities": "Classic Toor",
        "volume": "24 MT",
        "incoterms": "CIF Jebel Ali"
    }
    obj = validate_schema(InquiryCreateSchema, valid)
    assert obj.name == "Ahmad Al-Mansoor"
    assert obj.email == "ahmad@gulfagri.ae"


def test_inquiry_schema_rejects_empty_name():
    invalid = {
        "name": "   ",
        "email": "ahmad@gulfagri.ae"
    }
    with pytest.raises(ValueError) as exc:
        validate_schema(InquiryCreateSchema, invalid)
    assert "Name cannot be blank" in str(exc.value)


def test_inquiry_schema_rejects_invalid_email():
    invalid = {
        "name": "John Doe",
        "email": "not-an-email"
    }
    with pytest.raises(ValueError) as exc:
        validate_schema(InquiryCreateSchema, invalid)
    assert "Invalid email format" in str(exc.value)


# ================= 2. DOMESTIC ORDER SCHEMA CONTRACT TESTS =================

def test_domestic_order_schema_valid():
    valid = {
        "commodity": "Classic Toor (Tur Dal)",
        "packSize": "1kg",
        "quantity": 2,
        "consigneeName": "Aarav Patil",
        "consigneePhone": "+91 98200 12345",
        "consigneeEmail": "aarav@patilfarms.in",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001"
    }
    obj = validate_schema(DomesticOrderCreateSchema, valid)
    assert obj.commodity == "Classic Toor (Tur Dal)"
    assert obj.quantity == 2


def test_domestic_order_schema_rejects_zero_or_negative_quantity():
    invalid = {
        "commodity": "Classic Toor",
        "quantity": 0
    }
    with pytest.raises(ValueError):
        validate_schema(DomesticOrderCreateSchema, invalid)

    invalid_neg = {
        "commodity": "Classic Toor",
        "quantity": -5
    }
    with pytest.raises(ValueError):
        validate_schema(DomesticOrderCreateSchema, invalid_neg)


def test_domestic_order_verify_upi_requires_utr():
    invalid = {
        "orderId": "GGE-DOM-TEST",
        "utr": ""
    }
    with pytest.raises(ValueError) as exc:
        validate_schema(DomesticOrderVerifyUpiSchema, invalid)
    assert "Valid UPI Reference Number / UTR is required" in str(exc.value)


# ================= 3. AUTHENTICATION SCHEMA CONTRACT TESTS =================

def test_auth_step1_schema_valid():
    valid = {
        "email": "admin@goldenglobalexpo.com",
        "password": "SecretPassword123!"
    }
    obj = validate_schema(AuthLoginStep1Schema, valid)
    assert obj.email == "admin@goldenglobalexpo.com"


def test_auth_verify_otp_requires_code():
    invalid = {
        "email": "admin@goldenglobalexpo.com",
        "otp": "   "
    }
    with pytest.raises(ValueError) as exc:
        validate_schema(AuthVerifyOtpSchema, invalid)
    assert "Security code is required" in str(exc.value)


# ================= 4. OBSERVABILITY CONTRACT VALIDATION =================

def test_healthz_response_schema_contract(client):
    """Verify live GET /healthz response matches HealthzResponseSchema contract."""
    resp = client.get("/healthz")
    assert resp.status_code == 200
    data = resp.json()
    validated = HealthzResponseSchema.model_validate(data)
    assert validated.status == "ok"
    assert validated.uptimeSeconds >= 0


def test_readyz_response_schema_contract(client):
    """Verify live GET /readyz response matches ReadyzResponseSchema contract."""
    resp = client.get("/readyz")
    assert resp.status_code == 200
    data = resp.json()
    validated = ReadyzResponseSchema.model_validate(data)
    assert validated.status == "ready"
    assert validated.database == "CONNECTED"

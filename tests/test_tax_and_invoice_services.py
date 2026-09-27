"""
Tests for Statutory Tax Engine (GST) & Export Invoice / Packing List Builders
Verifies calculation precision, boundary inputs, and XSS sanitization across trade documents.
"""

import pytest
from backend.services.tax_service import TaxCalculationService, TaxComputationResult
from backend.services.invoice_builder import InvoiceBuilder, SELLER_DETAILS
from backend.services.proforma_builder import ProformaInvoiceBuilder, PackingListBuilder


# ================= 1. GST TAX CALCULATION ENGINE TESTS =================

def test_tax_calculation_intrastate_maharashtra():
    """Intra-state Maharashtra must apply split CGST 2.5% and SGST 2.5% (Total 5%)."""
    result = TaxCalculationService.compute_tax(
        total_amount=1050.0,
        quantity=1,
        state="Maharashtra",
        commodity_name="Classic Toor"
    )
    assert isinstance(result, TaxComputationResult)
    assert result.is_interstate is False
    assert result.cgst_rate == 0.025
    assert result.sgst_rate == 0.025
    assert result.cgst_amount > 0
    assert result.sgst_amount > 0
    assert result.igst_amount == 0.0
    assert round(result.taxable_value + result.cgst_amount + result.sgst_amount, 2) == 1050.0


def test_tax_calculation_interstate_outside_maharashtra():
    """Inter-state outside Maharashtra (e.g. Karnataka) must apply full IGST 5%."""
    result = TaxCalculationService.compute_tax(
        total_amount=2100.0,
        quantity=2,
        state="Karnataka",
        commodity_name="Chia Seeds"
    )
    assert result.is_interstate is True
    assert result.igst_rate == 0.05
    assert result.cgst_amount == 0.0
    assert result.sgst_amount == 0.0
    assert result.igst_amount > 0.0
    assert round(result.taxable_value + result.igst_amount, 2) == 2100.0


def test_tax_calculation_zero_amount():
    """Zero amount order should compute cleanly without division by zero errors."""
    result = TaxCalculationService.compute_tax(
        total_amount=0.0,
        quantity=1,
        state="Maharashtra"
    )
    assert result.taxable_value == 0.0
    assert result.total_tax == 0.0
    assert result.total_amount == 0.0


def test_tax_calculation_large_order_amount():
    """High-value industrial wholesale volume should maintain precision without floating-point drift."""
    large_amount = 500000.0
    result = TaxCalculationService.compute_tax(
        total_amount=large_amount,
        quantity=100,
        state="Gujarat"
    )
    assert result.is_interstate is True
    assert round(result.taxable_value + result.igst_amount, 2) == large_amount



# ================= 2. DOMESTIC TAX INVOICE BUILDER TESTS =================

def test_invoice_builder_generates_valid_html_and_escapes_xss():
    """Verify InvoiceBuilder escapes malicious XSS characters in buyer details."""
    malicious_order = {
        "id": "GGE-DOM-TEST-XSS",
        "orderId": "GGE-DOM-TEST-XSS",
        "consigneeName": "<script>alert('xss_name')</script>John Doe",
        "deliveryAddress": "<img src=x onerror=alert('xss_addr')>123 Trade Way",
        "city": "Mumbai<b onmouseover=alert(1)>",
        "state": "Maharashtra",
        "pincode": "400001",
        "gstin": "27AAGPB8439A1Z1<iframe src='bad.com'>",
        "commodity": "Classic Toor (Tur Dal)",
        "pack_size": "1kg",
        "quantity": 2,
        "amount": 320.0
    }

    builder = InvoiceBuilder(malicious_order)
    html_out = builder.build_html()

    assert "<script>" not in html_out
    assert "&lt;script&gt;" in html_out
    assert "<img src=x" not in html_out
    assert "&lt;img" in html_out
    assert "<iframe" not in html_out
    assert "TAX INVOICE" in html_out
    assert "PAID VIA UPI" in html_out


def test_invoice_builder_to_dict_matches_calculations():
    order = {
        "id": "GGE-DOM-9921",
        "consigneeName": "Agro Supplies Ltd",
        "deliveryAddress": "Plot 42, Vashi APMC",
        "city": "Navi Mumbai",
        "state": "Maharashtra",
        "pincode": "400703",
        "commodity": "Moong Whole",
        "pack_size": "5kg",
        "quantity": 4,
        "amount": 2880.0
    }
    builder = InvoiceBuilder(order)
    doc = builder.to_dict()

    assert doc["invoiceNumber"]
    assert doc["seller"]["tradeName"] == "Golden Global Expo"
    assert doc["taxBreakdown"]["taxableValue"] > 0
    assert doc["totalAmount"] == 2880.0


# ================= 3. PROFORMA INVOICE & PACKING LIST BUILDER TESTS =================

def test_proforma_builder_single_item_and_url_safe_hashing():
    pi_data = {
        "piNumber": "PI-2026-DXB-991",
        "commodity": "Classic Toor (Sortex Grade-A)",
        "volume": 24.0,
        "price": 820.0,
        "incoterms": "CIF Jebel Ali (Incoterms 2020)",
        "buyerCompany": "Dubai Commodities FZE",
        "buyerCountry": "UAE",
        "freight": 1200.0,
        "insurance": 250.0
    }
    builder = ProformaInvoiceBuilder(pi_data)
    result = builder.to_dict()

    expected_subtotal = 24.0 * 820.0
    assert result["subtotal"] == expected_subtotal
    assert result["freight"] == 1200.0
    assert result["insurance"] == 250.0
    assert result["grandTotal"] == expected_subtotal + 1200.0 + 250.0
    assert len(result["securityHash"]) == 64  # SHA-256 hex string

    html_doc = builder.build_html()
    assert "PI-2026-DXB-991" in html_doc
    assert "PROFORMA INVOICE" in html_doc


def test_packing_list_builder_tally_and_weights():
    pl_data = {
        "plNumber": "PL-2026-004",
        "piRef": "PI-2026-DXB-991",
        "commodity": "Sortex Clean Tur Dal",
        "totalBags": 480,
        "netWeightMt": 24.0,
        "grossWeightMt": 24.24,
        "tareWeightMt": 0.24,
        "buyerName": "Gulf Distribution LLC",
        "containerNo": "MSCU 910293-4",
        "sealNo": "IN-CUS-88192"
    }
    builder = PackingListBuilder(pl_data)
    doc = builder.to_dict()
    assert doc["totalBags"] == 480
    assert doc["netWeightMt"] == 24.0
    assert doc["grossWeightMt"] == 24.24

    html_out = builder.build_html()
    assert "MSCU 910293-4" in html_out
    assert "IN-CUS-88192" in html_out
    assert "COMMERCIAL PACKING LIST" in html_out

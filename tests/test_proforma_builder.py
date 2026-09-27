import pytest
from starlette.testclient import TestClient
from backend.app import app
from backend.services.proforma_builder import ProformaInvoiceBuilder, PackingListBuilder

client = TestClient(app)

def test_proforma_builder_unit():
    """Verify ProformaInvoiceBuilder generates compliant ICC Incoterms 2020 documents."""
    data = {
        "buyerCompany": "Gulf Food Distributors LLC",
        "buyerName": "Tariq Al-Mansoor",
        "buyerCountry": "United Arab Emirates",
        "destination": "Jebel Ali Port (AEJEA), Dubai",
        "incoterms": "CIF Jebel Ali Port (Incoterms 2020)",
        "currency": "USD",
        "items": [
            {
                "commodity": "Classic Toor (Tur Dal Sortex A)",
                "quantityMt": 48.0,
                "unitPriceUsd": 850.0,
                "packaging": "50 KG Bags in 2x20' FCL"
            },
            {
                "commodity": "Chia Seeds (Superfood)",
                "quantityMt": 10.0,
                "unitPriceUsd": 1900.0,
                "packaging": "25 KG Vacuum Bags"
            }
        ],
        "freight": 2400.0,
        "insurance": 350.0
    }
    builder = ProformaInvoiceBuilder(data)
    result = builder.to_dict()

    assert result["documentType"] == "PROFORMA_INVOICE"
    assert result["buyer"]["company"] == "Gulf Food Distributors LLC"
    assert result["subtotal"] == (48.0 * 850.0) + (10.0 * 1900.0)
    assert result["grandTotal"] == result["subtotal"] + 2400.0 + 350.0
    assert "AAGPB8439A" in result["seller"]["dgftIec"]
    assert "000405012349" in result["seller"]["accountNo"]
    assert len(result["securityHash"]) == 64

    # HTML verification
    html = builder.build_html()
    assert "PROFORMA INVOICE" in html
    assert "Gulf Food Distributors LLC" in html
    assert "SWIFT MT103" in html
    assert "JNPT Nhava Sheva" in html
    assert "window.print()" in html

def test_packing_list_builder_unit():
    """Verify PackingListBuilder constructs maritime container manifests."""
    data = {
        "buyerName": "Rotterdam Agri Importers B.V.",
        "buyerCountry": "Netherlands",
        "commodity": "Organic Chia Seeds",
        "totalBags": 960,
        "netWeightMt": 24.0,
        "grossWeightMt": 24.18,
        "container": "MSCU 910293-4 (20' GP)",
        "sealNo": "IN-CUSTOMS-88192"
    }
    builder = PackingListBuilder(data)
    result = builder.to_dict()

    assert result["documentType"] == "COMMERCIAL_PACKING_LIST"
    assert result["containerNo"] == "MSCU 910293-4 (20' GP)"
    assert result["tareWeightMt"] == 0.18
    assert result["totalBags"] == 960

    html = builder.build_html()
    assert "COMMERCIAL PACKING LIST" in html
    assert "Rotterdam Agri Importers B.V." in html
    assert "MSCU 910293-4" in html

def test_api_generate_proforma_invoice():
    """Verify POST /api/documents/proforma-invoice JSON & HTML responses."""
    payload = {
        "buyerCompany": "SingaImports Pte Ltd",
        "volume": "26 MT",
        "commodity": "Classic Chana Dal",
        "unitPriceUsd": 780.0
    }
    res = client.post("/api/documents/proforma-invoice", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "proformaInvoice" in data
    pi = data["proformaInvoice"]
    assert pi["buyer"]["company"] == "SingaImports Pte Ltd"
    assert pi["subtotal"] > 0
    assert "html" in pi

    # HTML format query param
    res_html = client.post("/api/documents/proforma-invoice?format=html", json=payload)
    assert res_html.status_code == 200
    assert "text/html" in res_html.headers.get("content-type", "")
    assert "SingaImports Pte Ltd" in res_html.text

def test_api_generate_packing_list():
    """Verify POST /api/documents/packing-list endpoint."""
    payload = {
        "buyerName": "EuroTrade Logistics",
        "container": "CMAU 492019-3",
        "totalBags": 500
    }
    res = client.post("/api/documents/packing-list", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["packingList"]["containerNo"] == "CMAU 492019-3"

def test_proforma_builder_formatted_strings_resilience():
    """Verify builder handles currency symbols, commas, and unit strings gracefully."""
    data = {
        "buyerCompany": "Apex Middle East LLC",
        "volume": "50 MT (2x20' FCL)",
        "commodity": "Classic Toor",
        "unitPriceUsd": "$850 / MT",
        "freight": "$2,500.00",
        "insurance": "$350.50"
    }
    builder = ProformaInvoiceBuilder(data)
    result = builder.to_dict()
    assert result["items"][0]["quantityMt"] == 50.0
    assert result["items"][0]["unitPrice"] == 850.0
    assert result["items"][0]["total"] == 42500.0
    assert result["freight"] == 2500.0
    assert result["insurance"] == 350.50
    assert result["grandTotal"] == 42500.0 + 2500.0 + 350.50

    # Also test PackingListBuilder with string numbers
    pl_data = {
        "totalBags": "960 bags",
        "netWeightMt": "48.0 MT",
        "grossWeightMt": "48.24 MT"
    }
    pl_builder = PackingListBuilder(pl_data)
    pl_result = pl_builder.to_dict()
    assert pl_result["totalBags"] == 960
    assert pl_result["netWeightMt"] == 48.0
    assert pl_result["grossWeightMt"] == 48.24
    assert pl_result["tareWeightMt"] == 0.24

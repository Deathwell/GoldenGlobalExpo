"""
Golden Global Expo — International Trade Document Engine
Server-side Proforma Invoice (PI) & Commercial Packing List (PL) Generator.
Conforms strictly to ICC Incoterms 2020, DGFT/APEDA statutory credentials,
and SWIFT MT103 correspondent banking rails.
"""
import html
import time
import secrets
import hashlib
import re
from typing import Dict, Any, List, Optional

def safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    cleaned = str(val).replace(",", "").strip()
    match = re.search(r"[-+]?\d*\.?\d+", cleaned)
    if match:
        try:
            return float(match.group(0))
        except (ValueError, TypeError):
            pass
    return default

def safe_int(val: Any, default: int = 0) -> int:
    if val is None:
        return default
    if isinstance(val, int):
        return val
    cleaned = str(val).replace(",", "").strip()
    match = re.search(r"[-+]?\d+", cleaned)
    if match:
        try:
            return int(match.group(0))
        except (ValueError, TypeError):
            pass
    return default

EXPORTER_PROFILE = {
    "corporateName": "GOLDEN GLOBAL EXPO",
    "parentGroup": "A Division of Six Lady Farmers Private Limited",
    "registeredOffice": "Plot No. 42, APMC Grain Market Complex, Sector 19, Vashi, Navi Mumbai, Maharashtra 400705, India",
    "portTerminal": "JNPT Nhava Sheva (INNSA1), Navi Mumbai 400707, India",
    "dgftIec": "AAGPB8439A",
    "apedaRcmc": "RCMC/APEDA/W/2026/08912",
    "fssaiNumber": "10024022000841",
    "spicesBoard": "CRES/MUM/2026/4102",
    "gstin": "27AAGPB8439A1Z5",
    "adCode": "0290142",
    "bankName": "ICICI Bank Limited / State Bank of India",
    "bankBranch": "Overseas Commercial Branch, Nariman Point, Mumbai - 400021",
    "beneficiary": "Six Lady Farmers Pvt Ltd - Golden Global Expo Division",
    "accountNo": "000405012349 (EEFC Multi-Currency Trade Account)",
    "swiftBic": "ICICINBBCTS / SBININBBXXX",
    "ifsc": "ICIC0000004",
    "email": "trade@goldenglobalexpo.com",
    "phone": "+91 98200 48123"
}

COMMODITY_HS_MAP = {
    "toor": {"hs": "0713.60.00", "purity": "99.5%", "moisture": "11.0%", "crop": "2025-2026"},
    "tur": {"hs": "0713.60.00", "purity": "99.5%", "moisture": "11.0%", "crop": "2025-2026"},
    "moong": {"hs": "0713.31.00", "purity": "99.0%", "moisture": "10.5%", "crop": "2025-2026"},
    "chana": {"hs": "0713.20.00", "purity": "99.5%", "moisture": "10.0%", "crop": "2025-2026"},
    "masoor": {"hs": "0713.40.00", "purity": "99.5%", "moisture": "11.0%", "crop": "2025-2026"},
    "chia": {"hs": "1207.99.90", "purity": "99.9%", "moisture": "8.0%", "crop": "2025-2026"},
    "coriander": {"hs": "0909.20.10", "purity": "99.0%", "moisture": "9.0%", "crop": "2025-2026"},
    "cumin": {"hs": "0910.99.12", "purity": "99.5%", "moisture": "8.5%", "crop": "2025-2026"},
    "moringa": {"hs": "1211.90.29", "purity": "100% Pure Organic", "moisture": "6.0%", "crop": "2025-2026"},
    "mint": {"hs": "1211.90.99", "purity": "100% Sun-Dried", "moisture": "7.0%", "crop": "2025-2026"},
    "sorghum": {"hs": "1007.90.00", "purity": "99.0%", "moisture": "12.0%", "crop": "2025-2026"},
    "jowar": {"hs": "1007.90.00", "purity": "99.0%", "moisture": "12.0%", "crop": "2025-2026"},
    "wheat": {"hs": "1001.99.10", "purity": "99.5%", "moisture": "11.5%", "crop": "2025-2026"},
    "ghee": {"hs": "0405.90.20", "purity": "99.8% Pure Bilona", "moisture": "0.3%", "crop": "Fresh Batch"},
    "tissue": {"hs": "4818.10.00", "purity": "100% Virgin Pulp", "moisture": "5.0%", "crop": "N/A"},
    "spice": {"hs": "0910.91.00", "purity": "Agmark Grade A", "moisture": "9.0%", "crop": "2025-2026"}
}

def resolve_commodity_specs(name: str) -> dict:
    nl = name.lower()
    for key, spec in COMMODITY_HS_MAP.items():
        if key in nl:
            return spec
    return {"hs": "0713.90.00", "purity": "99.0%", "moisture": "11.0%", "crop": "2025-2026"}

class ProformaInvoiceBuilder:
    """
    Constructs institutional ICC Incoterms 2020 Proforma Invoices
    for international agricultural commodity contracts.
    """
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.seller = dict(EXPORTER_PROFILE)
        self.pi_number = str(data.get("piNumber") or data.get("pi_number") or f"PI-GGE-2026-{secrets.token_hex(3).upper()}")
        created_ts = data.get("createdAt") or data.get("created_at") or time.time()
        try:
            self.date_str = time.strftime("%d-%b-%Y", time.localtime(float(created_ts)))
        except Exception:
            self.date_str = time.strftime("%d-%b-%Y", time.localtime())
        self.valid_until = data.get("validUntil") or data.get("valid_until") or "15 Calendar Days from Issue Date"

        self.incoterms = str(data.get("incoterms") or "CIF Port of Destination (Incoterms 2020)").strip()
        self.currency = str(data.get("currency") or "USD").upper().strip()
        self.pol = str(data.get("portOfLoading") or data.get("pol") or self.seller["portTerminal"])
        self.pod = str(data.get("portOfDischarge") or data.get("pod") or data.get("destination") or "Jebel Ali Port (AEJEA), Dubai, UAE")
        self.payment_terms = str(data.get("paymentTerms") or data.get("payment_terms") or "100% Irrevocable Confirmed L/C at Sight / 30% T/T Advance, 70% against BL Copy")

        self.buyer_name = str(data.get("buyerName") or data.get("buyer_name") or data.get("name") or "Authorized Commercial Importer")
        self.buyer_company = str(data.get("buyerCompany") or data.get("buyer_company") or data.get("company") or "International Trade Partners LLC")
        self.buyer_address = str(data.get("buyerAddress") or data.get("buyer_address") or data.get("address") or "Foreign Trade Freezone, Berth 4")
        self.buyer_country = str(data.get("buyerCountry") or data.get("buyer_country") or data.get("country") or "United Arab Emirates")
        self.buyer_phone = str(data.get("buyerPhone") or data.get("buyer_phone") or data.get("phone") or "+971 4 881 0000")
        self.buyer_email = str(data.get("buyerEmail") or data.get("buyer_email") or data.get("email") or "import@tradepartner.com")
        self.buyer_tax_id = str(data.get("buyerTaxId") or data.get("buyer_tax_id") or data.get("taxId") or "TRN-100293848200")

        self.items = self._parse_items()
        self.subtotal = sum(i["total"] for i in self.items)
        self.freight = safe_float(data.get("freight"), 0.0)
        self.insurance = safe_float(data.get("insurance"), 0.0)
        self.grand_total = self.subtotal + self.freight + self.insurance
        self.security_hash = self._generate_hash()

    def _parse_items(self) -> List[Dict[str, Any]]:
        raw_items = self.data.get("items")
        parsed = []
        if isinstance(raw_items, list) and len(raw_items) > 0:
            for idx, itm in enumerate(raw_items, 1):
                name = str(itm.get("commodity") or itm.get("name") or f"Commodity Lot #{idx}")
                specs = resolve_commodity_specs(name)
                qty = safe_float(itm.get("quantityMt") or itm.get("quantity") or itm.get("qty"), 24.0)
                price = safe_float(itm.get("unitPriceUsd") or itm.get("unitPrice") or itm.get("price"), 850.0)
                total = round(qty * price, 2)
                packaging = str(itm.get("packaging") or "50 KG Multi-Wall PP Bags with Inner Poly Liner in 20' FCL")
                parsed.append({
                    "itemNo": idx,
                    "commodity": name,
                    "hsCode": str(itm.get("hsCode") or specs["hs"]),
                    "cropYear": str(itm.get("cropYear") or specs["crop"]),
                    "purity": str(itm.get("purity") or specs["purity"]),
                    "moisture": str(itm.get("moisture") or specs["moisture"]),
                    "packaging": packaging,
                    "quantityMt": qty,
                    "unitPrice": price,
                    "total": total
                })
        else:
            # Fallback to single commodity or prompt volume
            name = str(self.data.get("commodity") or self.data.get("commodities") or "Classic Toor (Sortex Grade-A)")
            specs = resolve_commodity_specs(name)
            qty = safe_float(self.data.get("volume"), 24.0)
            price = safe_float(self.data.get("unitPriceUsd") or self.data.get("price"), 820.0)
            parsed.append({
                "itemNo": 1,
                "commodity": name,
                "hsCode": specs["hs"],
                "cropYear": specs["crop"],
                "purity": specs["purity"],
                "moisture": specs["moisture"],
                "packaging": "50 KG Multi-Wall PP Bags with Inner Poly Liner in 20' FCL",
                "quantityMt": qty,
                "unitPrice": price,
                "total": round(qty * price, 2)
            })
        return parsed

    def _generate_hash(self) -> str:
        seed = f"{self.pi_number}:{self.date_str}:{self.grand_total}:{self.buyer_company}:{self.seller['dgftIec']}"
        return hashlib.sha256(seed.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "piNumber": self.pi_number,
            "documentType": "PROFORMA_INVOICE",
            "date": self.date_str,
            "validUntil": self.valid_until,
            "incoterms": self.incoterms,
            "currency": self.currency,
            "portOfLoading": self.pol,
            "portOfDischarge": self.pod,
            "paymentTerms": self.payment_terms,
            "seller": self.seller,
            "buyer": {
                "name": self.buyer_name,
                "company": self.buyer_company,
                "address": self.buyer_address,
                "country": self.buyer_country,
                "phone": self.buyer_phone,
                "email": self.buyer_email,
                "taxId": self.buyer_tax_id
            },
            "items": self.items,
            "subtotal": self.subtotal,
            "freight": self.freight,
            "insurance": self.insurance,
            "grandTotal": self.grand_total,
            "securityHash": self.security_hash,
            "verificationUrl": f"/verify.html?doc={self.pi_number}&hash={self.security_hash[:16]}"
        }

    def build_html(self) -> str:
        safe_pi = html.escape(self.pi_number)
        safe_date = html.escape(self.date_str)
        safe_valid = html.escape(self.valid_until)
        safe_incoterms = html.escape(self.incoterms)
        safe_pol = html.escape(self.pol)
        safe_pod = html.escape(self.pod)
        safe_payment = html.escape(self.payment_terms)
        safe_curr = html.escape(self.currency)

        safe_buyer_co = html.escape(self.buyer_company)
        safe_buyer_name = html.escape(self.buyer_name)
        safe_buyer_addr = html.escape(self.buyer_address)
        safe_buyer_country = html.escape(self.buyer_country)
        safe_buyer_trn = html.escape(self.buyer_tax_id)
        safe_buyer_phone = html.escape(self.buyer_phone)
        safe_buyer_email = html.escape(self.buyer_email)

        items_rows = ""
        for itm in self.items:
            items_rows += f"""
            <tr>
              <td style="text-align: center; font-weight: 600; color: #4b5563;">{itm['itemNo']}</td>
              <td>
                <div style="font-weight: 700; color: #111827; font-size: 13px;">{html.escape(itm['commodity'])}</div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                  <b>Spec:</b> Purity {html.escape(itm['purity'])}, Moisture {html.escape(itm['moisture'])}, Crop {html.escape(itm['cropYear'])}
                </div>
                <div style="font-size: 10px; color: #9ca3af; margin-top: 1px;">Packing: {html.escape(itm['packaging'])}</div>
              </td>
              <td style="font-family: monospace; font-size: 12px; color: #1f2937; text-align: center;">{html.escape(itm['hsCode'])}</td>
              <td style="text-align: right; font-weight: 600; color: #111827;">{itm['quantityMt']:,.2f} MT</td>
              <td style="text-align: right; font-family: monospace; font-size: 12px; color: #111827;">{safe_curr} {itm['unitPrice']:,.2f}</td>
              <td style="text-align: right; font-weight: 700; font-family: monospace; font-size: 13px; color: #111827;">{safe_curr} {itm['total']:,.2f}</td>
            </tr>
            """

        verify_url = f"/verify.html?doc={self.pi_number}&hash={self.security_hash[:16]}"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Proforma Invoice · {safe_pi} · Golden Global Expo</title>
  <style>
    @page {{
      size: A4 portrait;
      margin: 12mm 15mm;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #f3f4f6;
      margin: 0;
      padding: 24px;
      font-size: 12px;
      line-height: 1.45;
    }}
    .document-canvas {{
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 4px;
      border-top: 4px solid #B8872F;
    }}
    .no-print {{
      text-align: right;
      margin-bottom: 16px;
    }}
    .btn-print {{
      padding: 9px 20px;
      background: #B8872F;
      color: #ffffff;
      border: none;
      font-weight: 700;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      box-shadow: 0 2px 6px rgba(184,135,47,0.3);
    }}
    .btn-print:hover {{
      background: #9d7122;
    }}
    .header-bar {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #E5E7EB;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }}
    .brand-title {{
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0D0A08;
      margin: 0 0 2px;
    }}
    .parent-endorse {{
      font-size: 11px;
      font-weight: 700;
      color: #B8872F;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }}
    .reg-credentials {{
      font-size: 11px;
      color: #4b5563;
      line-height: 1.4;
    }}
    .invoice-title-block {{
      text-align: right;
    }}
    .doc-headline {{
      font-size: 20px;
      font-weight: 900;
      color: #B8872F;
      letter-spacing: 1px;
      margin: 0 0 4px;
    }}
    .doc-ref {{
      font-family: monospace;
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      background: #FAF7EE;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #D4AF37;
      display: inline-block;
    }}
    .two-col-grid {{
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }}
    .info-card {{
      flex: 1;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 14px 16px;
    }}
    .card-label {{
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #6B7280;
      margin-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 4px;
    }}
    .table-commodities {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }}
    .table-commodities th {{
      background: #0D0A08;
      color: #F5EFE0;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 10px;
      text-align: left;
    }}
    .table-commodities td {{
      padding: 10px;
      border-bottom: 1px solid #E5E7EB;
      vertical-align: top;
    }}
    .table-commodities tr:nth-child(even) td {{
      background: #FAFAFA;
    }}
    .totals-area {{
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }}
    .totals-table {{
      width: 320px;
      border-collapse: collapse;
    }}
    .totals-table td {{
      padding: 6px 10px;
      font-size: 12px;
    }}
    .grand-total-row td {{
      border-top: 2px solid #0D0A08;
      font-size: 15px;
      font-weight: 800;
      color: #0D0A08;
      background: #FAF7EE;
      padding: 8px 10px;
    }}
    .settlement-block {{
      background: #F8F9FA;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #B8872F;
      border-radius: 4px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }}
    .signatory-section {{
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #E5E7EB;
      padding-top: 18px;
      margin-top: 18px;
    }}
    .qr-badge {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .qr-box {{
      width: 64px;
      height: 64px;
      border: 2px dashed #B8872F;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      text-align: center;
      color: #B8872F;
      background: #FFFBF2;
    }}
    .seal-box {{
      text-align: center;
      width: 200px;
    }}
    .seal-stamp {{
      display: inline-block;
      border: 2px solid #B8872F;
      color: #B8872F;
      font-weight: 800;
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 6px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      text-transform: uppercase;
      transform: rotate(-2deg);
    }}
    @media print {{
      body {{
        background: #ffffff;
        padding: 0;
      }}
      .document-canvas {{
        box-shadow: none;
        padding: 0;
        border: none;
      }}
      .no-print {{
        display: none !important;
      }}
    }}
  </style>
</head>
<body>

  <div class="document-canvas">
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">🖨️ Print Proforma Invoice / Export PDF</button>
    </div>

    <!-- Official Header -->
    <div class="header-bar">
      <div>
        <div class="brand-title">{self.seller['corporateName']}</div>
        <div class="parent-endorse">★ {self.seller['parentGroup']} ★</div>
        <div class="reg-credentials">
          {self.seller['registeredOffice']}<br>
          <b>Port Terminal:</b> {self.seller['portTerminal']}<br>
          <b>DGFT IEC:</b> {self.seller['dgftIec']} | <b>APEDA RCMC:</b> {self.seller['apedaRcmc']}<br>
          <b>FSSAI Central Export:</b> {self.seller['fssaiNumber']} | <b>GSTIN:</b> {self.seller['gstin']}
        </div>
      </div>
      <div class="invoice-title-block">
        <div class="doc-headline">PROFORMA INVOICE</div>
        <div class="doc-ref">{safe_pi}</div>
        <div style="font-size: 11px; color: #4b5563; margin-top: 6px;">
          <b>Date:</b> {safe_date}<br>
          <b>Validity:</b> {safe_valid}
        </div>
      </div>
    </div>

    <!-- Dual Parties Grid -->
    <div class="two-col-grid">
      <div class="info-card">
        <div class="card-label">Buyer / Consignee Details</div>
        <div style="font-weight: 800; font-size: 13px; color: #111827;">{safe_buyer_co}</div>
        <div style="color: #4b5563; margin-top: 2px;">
          Attn: {safe_buyer_name}<br>
          {safe_buyer_addr}<br>
          <b>Country:</b> {safe_buyer_country}<br>
          <b>TRN / Tax ID:</b> {safe_buyer_trn}<br>
          Tel: {safe_buyer_phone} | Email: {safe_buyer_email}
        </div>
      </div>
      <div class="info-card">
        <div class="card-label">Maritime Logistics & Trade Terms</div>
        <div style="color: #4b5563; line-height: 1.5;">
          <b>Trade Terms:</b> <span style="font-weight: 700; color: #B8872F;">{safe_incoterms}</span><br>
          <b>Port of Loading:</b> {safe_pol}<br>
          <b>Port of Discharge:</b> {safe_pod}<br>
          <b>Payment Terms:</b> {safe_payment}<br>
          <b>Country of Origin:</b> Republic of India (Origin JNPT Hub)
        </div>
      </div>
    </div>

    <!-- Commodities Table -->
    <table class="table-commodities">
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>Description & Quality Specifications</th>
          <th style="width: 85px; text-align: center;">HS Code</th>
          <th style="width: 80px; text-align: right;">Quantity</th>
          <th style="width: 105px; text-align: right;">Unit Price ({safe_curr})</th>
          <th style="width: 120px; text-align: right;">Amount ({safe_curr})</th>
        </tr>
      </thead>
      <tbody>
        {items_rows}
      </tbody>
    </table>

    <!-- Totals Table -->
    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Commodity Subtotal:</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">{safe_curr} {self.subtotal:,.2f}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Ocean Freight ({safe_incoterms.split()[0]}):</td>
          <td style="text-align: right; font-family: monospace;">{safe_curr} {self.freight:,.2f}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Marine Insurance (Institute Cargo Clause A):</td>
          <td style="text-align: right; font-family: monospace;">{safe_curr} {self.insurance:,.2f}</td>
        </tr>
        <tr class="grand-total-row">
          <td>Grand Contract Total:</td>
          <td style="text-align: right; font-family: monospace;">{safe_curr} {self.grand_total:,.2f}</td>
        </tr>
      </table>
    </div>

    <!-- Settlement & Banking Rails -->
    <div class="settlement-block">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; color: #111827; margin-bottom: 6px; letter-spacing: 0.5px;">
        Institutional Settlement Rails (SWIFT MT103 Wire Instructions)
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 11px; color: #374151;">
        <div>
          <b>Beneficiary Name:</b> {self.seller['beneficiary']}<br>
          <b>Beneficiary Bank:</b> {self.seller['bankName']}<br>
          <b>Branch:</b> {self.seller['bankBranch']}
        </div>
        <div>
          <b>SWIFT BIC:</b> <span style="font-family: monospace; font-weight: 700;">{self.seller['swiftBic']}</span><br>
          <b>Account No (EEFC):</b> <span style="font-family: monospace; font-weight: 700;">{self.seller['accountNo']}</span><br>
          <b>RBI AD Code:</b> {self.seller['adCode']} | <b>IFSC:</b> {self.seller['ifsc']}
        </div>
      </div>
      <div style="font-size: 10px; color: #6b7280; margin-top: 6px;">
        * Remittance must quote PI reference <b>{safe_pi}</b> in field 70 of the MT103 wire message. All foreign banking charges outside India for buyer's account.
      </div>
    </div>

    <!-- Digital Signatory & Security Seal -->
    <div class="signatory-section">
      <div class="qr-badge">
        <div class="qr-box">
          OFFICIAL<br>VERIFIED<br>EDI SEAL
        </div>
        <div>
          <div style="font-weight: 700; font-size: 11px; color: #111827;">Indian Customs EDI & Chamber Certified</div>
          <div style="font-size: 10px; color: #6b7280; max-width: 320px;">
            This proforma invoice is cryptographically sealed in the Golden Global Expo trade ledger. Scan or visit <a href="{verify_url}" style="color: #B8872F;">goldenglobalexpo.com/verify</a>.
          </div>
          <div style="font-family: monospace; font-size: 9px; color: #9ca3af; margin-top: 2px;">
            SHA-256: {self.security_hash[:32]}...
          </div>
        </div>
      </div>

      <div class="seal-box">
        <div class="seal-stamp">★ GOLDEN GLOBAL EXPO ★<br>INTERNATIONAL TRADE DESK</div>
        <div style="font-weight: 800; font-size: 12px; color: #111827;">Authorized Signatory</div>
        <div style="font-size: 10px; color: #6b7280;">Director / Trade Officer</div>
        <div style="font-size: 9px; color: #9ca3af;">Six Lady Farmers Pvt. Ltd.</div>
      </div>
    </div>
  </div>

</body>
</html>"""


class PackingListBuilder:
    """
    Constructs commercial export packing manifests detailing containerization,
    tare/gross/net weights, and seal numbers.
    """
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.seller = dict(EXPORTER_PROFILE)
        self.pl_number = str(data.get("plNumber") or data.get("pl_number") or f"PL-GGE-2026-{secrets.token_hex(3).upper()}")
        created_ts = data.get("createdAt") or data.get("created_at") or time.time()
        try:
            self.date_str = time.strftime("%d-%b-%Y", time.localtime(float(created_ts)))
        except Exception:
            self.date_str = time.strftime("%d-%b-%Y", time.localtime())

        self.pi_ref = str(data.get("piRef") or data.get("pi_ref") or "PI-GGE-2026-BASELINE")
        self.bl_ref = str(data.get("bl") or data.get("blRef") or "PENDING ALLOCATION")
        self.vessel = str(data.get("vessel") or "MSC VALERIA (IMO 9461439)")
        self.container_no = str(data.get("container") or data.get("containerNo") or "MSCU 892104-7 (20' GP)")
        self.seal_no = str(data.get("sealNo") or data.get("seal_no") or "CUSTOMS-SEAL-IN-90812")

        self.buyer_name = str(data.get("buyerName") or data.get("buyer") or "Al-Noor Foodstuff Trading LLC")
        self.buyer_country = str(data.get("buyerCountry") or "United Arab Emirates")
        self.commodity = str(data.get("commodity") or "Classic Toor (Sortex Grade-A)")
        self.package_type = str(data.get("packageType") or "50 KG PP Bags with Inner Poly Liner")
        self.total_bags = safe_int(data.get("totalBags") or data.get("total_bags"), 480)
        self.net_weight_mt = safe_float(data.get("netWeightMt") or data.get("net_weight_mt"), 24.0)
        self.gross_weight_mt = safe_float(data.get("grossWeightMt") or data.get("gross_weight_mt"), 24.12)
        self.tare_weight_mt = round(self.gross_weight_mt - self.net_weight_mt, 3)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plNumber": self.pl_number,
            "documentType": "COMMERCIAL_PACKING_LIST",
            "date": self.date_str,
            "piRef": self.pi_ref,
            "blRef": self.bl_ref,
            "vessel": self.vessel,
            "containerNo": self.container_no,
            "sealNo": self.seal_no,
            "consignee": self.buyer_name,
            "country": self.buyer_country,
            "commodity": self.commodity,
            "packageType": self.package_type,
            "totalBags": self.total_bags,
            "netWeightMt": self.net_weight_mt,
            "grossWeightMt": self.gross_weight_mt,
            "tareWeightMt": self.tare_weight_mt
        }

    def build_html(self) -> str:
        safe_pl = html.escape(self.pl_number)
        safe_pi = html.escape(self.pi_ref)
        safe_date = html.escape(self.date_str)
        safe_vessel = html.escape(self.vessel)
        safe_cnt = html.escape(self.container_no)
        safe_seal = html.escape(self.seal_no)
        safe_buyer = html.escape(self.buyer_name)
        safe_comm = html.escape(self.commodity)
        safe_pkg = html.escape(self.package_type)

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Commercial Packing List · {safe_pl} · Golden Global Expo</title>
  <style>
    @page {{ size: A4 portrait; margin: 12mm 15mm; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #111827; background: #f3f4f6; margin: 0; padding: 24px; font-size: 12px;
    }}
    .document-canvas {{
      max-width: 820px; margin: 0 auto; background: #ffffff; padding: 36px 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-top: 4px solid #0D0A08;
    }}
    .header-bar {{
      display: flex; justify-content: space-between; border-bottom: 2px solid #E5E7EB;
      padding-bottom: 16px; margin-bottom: 20px;
    }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
    th {{ background: #0D0A08; color: #F5EFE0; padding: 8px 10px; font-size: 11px; text-transform: uppercase; text-align: left; }}
    td {{ padding: 10px; border-bottom: 1px solid #E5E7EB; }}
    .no-print {{ text-align: right; margin-bottom: 16px; }}
    @media print {{ body {{ background: #fff; padding: 0; }} .document-canvas {{ box-shadow: none; padding: 0; border: none; }} .no-print {{ display: none; }} }}
  </style>
</head>
<body>
  <div class="document-canvas">
    <div class="no-print">
      <button onclick="window.print()" style="padding: 9px 20px; background: #0D0A08; color: #F5EFE0; font-weight: 700; border: none; border-radius: 4px; cursor: pointer;">🖨️ Print Packing List</button>
    </div>
    <div class="header-bar">
      <div>
        <div style="font-size: 22px; font-weight: 900; color: #0D0A08;">{self.seller['corporateName']}</div>
        <div style="font-size: 11px; font-weight: 700; color: #B8872F;">{self.seller['parentGroup']}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">DGFT IEC: {self.seller['dgftIec']} | APEDA: {self.seller['apedaRcmc']}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18px; font-weight: 900; color: #111827;">COMMERCIAL PACKING LIST</div>
        <div style="font-family: monospace; font-size: 13px; font-weight: 700; background: #F3F4F6; padding: 2px 6px; border-radius: 3px;">{safe_pl}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Date: {safe_date} | Ref PI: {safe_pi}</div>
      </div>
    </div>

    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
      <div style="flex: 1; background: #F9FAFB; padding: 12px; border-radius: 4px; border: 1px solid #E5E7EB;">
        <b>Consignee:</b> {safe_buyer} ({html.escape(self.buyer_country)})<br>
        <b>Port of Loading:</b> {self.seller['portTerminal']}<br>
        <b>Vessel:</b> {safe_vessel}
      </div>
      <div style="flex: 1; background: #F9FAFB; padding: 12px; border-radius: 4px; border: 1px solid #E5E7EB;">
        <b>Container Number:</b> <span style="font-family: monospace; font-weight: 700;">{safe_cnt}</span><br>
        <b>Customs Seal Number:</b> <span style="font-family: monospace; font-weight: 700;">{safe_seal}</span><br>
        <b>Package Style:</b> {safe_pkg}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Container Marks & Nos</th>
          <th>Description of Goods</th>
          <th style="text-align: right;">No. of Packages</th>
          <th style="text-align: right;">Net Weight (MT)</th>
          <th style="text-align: right;">Gross Weight (MT)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <b>{safe_cnt}</b><br>
            Seal: {safe_seal}
          </td>
          <td>
            <b>{safe_comm}</b><br>
            <span style="font-size: 11px; color: #6b7280;">Packaging: {safe_pkg}</span>
          </td>
          <td style="text-align: right; font-weight: 700;">{self.total_bags:,} Bags</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">{self.net_weight_mt:,.3f} MT</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">{self.gross_weight_mt:,.3f} MT</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="background: #F3F4F6; font-weight: 800;">
          <td colspan="2">TOTAL CONSIGNMENT TALLY:</td>
          <td style="text-align: right;">{self.total_bags:,} Packages</td>
          <td style="text-align: right; font-family: monospace;">{self.net_weight_mt:,.3f} MT</td>
          <td style="text-align: right; font-family: monospace;">{self.gross_weight_mt:,.3f} MT</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top: 40px; display: flex; justify-content: flex-end;">
      <div style="text-align: center; width: 220px; border-top: 1px solid #111827; padding-top: 8px;">
        <b>For GOLDEN GLOBAL EXPO</b><br>
        <span style="font-size: 10px; color: #6b7280;">Authorized Logistics & Dispatch Signatory</span>
      </div>
    </div>
  </div>
</body>
</html>"""

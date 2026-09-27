"""
Golden Global Expo — Invoice Builder & Document Renderer
Builder & Template Method pattern implementation for GST Tax Invoices and Commercial Documentation.
Decouples visual document layout, print CSS, and tax composition from HTTP transport routers (SRP & OCP).
"""
import html
import time
from typing import Dict, Any, Optional
from backend.services.tax_service import TaxCalculationService, TaxComputationResult

SELLER_DETAILS = {
    "legalName": "Golden Global Expo Private Limited",
    "tradeName": "Golden Global Expo",
    "address": "Terminal 2, Wadala East Logistics Hub, Mumbai, Maharashtra 400037",
    "state": "Maharashtra",
    "stateCode": "27",
    "gstin": "27AAGPB8439A1Z1",
    "fssaiNumber": "11521008000142",
    "apedaNumber": "APEDA/MUM/2026/09918",
    "email": "compliance@goldenglobalexpo.com",
    "phone": "+91 98200 48123"
}

class InvoiceBuilder:
    """
    Builder pattern for constructing structured JSON payloads and visually identical
    printable HTML tax invoices under the Central Goods and Services Tax Act, 2017.
    """

    def __init__(self, order_data: Dict[str, Any], tax_result: Optional[TaxComputationResult] = None):
        self.order = order_data
        self.tax_result = tax_result or TaxCalculationService.compute_tax(
            total_amount=self.order.get("amount", 0.0),
            quantity=self.order.get("quantity", 1),
            state=self.order.get("state", "Maharashtra"),
            commodity_name=self.order.get("commodity", "")
        )
        self.seller = dict(SELLER_DETAILS)
        self._init_metadata()

    def _init_metadata(self):
        clean_id = str(self.order.get("id") or self.order.get("orderId") or "DOM-ORDER")
        self.invoice_number = self.order.get("taxInvoiceRef") or self.order.get("tax_invoice_ref") or f"TAX-INV-DOM-{clean_id.replace('GGE-DOM-', '')}"
        created_ts = self.order.get("createdAt") or self.order.get("created_at") or time.time()
        try:
            self.invoice_date = time.strftime("%d-%b-%Y", time.localtime(float(created_ts)))
        except Exception:
            self.invoice_date = time.strftime("%d-%b-%Y", time.localtime())

    def build_header(self) -> str:
        safe_inv_no = html.escape(str(self.invoice_number))
        safe_inv_date = html.escape(str(self.invoice_date))
        return f"""
    <div class="no-print" style="text-align: right; margin-bottom: 16px;">
      <button onclick="window.print()" style="padding: 8px 16px; background: #D9AC52; border: none; color: #000; font-weight: 700; border-radius: 4px; cursor: pointer;">🖨️ Print / Save as PDF</button>
    </div>
    <div class="header">
      <div>
        <h1>{self.seller['tradeName'].upper()}</h1>
        <div style="font-size: 12px; color: #4b5563;">{self.seller['address']}</div>
        <div style="font-size: 11px; color: #6b7280;">GSTIN: <b>{self.seller['gstin']}</b> · FSSAI: <b>{self.seller['fssaiNumber']}</b></div>
      </div>
      <div style="text-align: right;">
        <h2 style="margin: 0 0 4px; font-size: 18px; color: #111827;">TAX INVOICE</h2>
        <div style="font-family: monospace; font-size: 13px; font-weight: 700;">{safe_inv_no}</div>
        <div style="font-size: 12px; color: #6b7280;">Date: {safe_inv_date}</div>
        <div style="margin-top: 6px;"><span class="badge">PAID VIA UPI</span></div>
      </div>
    </div>"""

    def build_seller_buyer_details(self) -> str:
        safe_consignee_name = html.escape(str(self.order.get("consigneeName") or self.order.get("consignee_name") or self.order.get("name") or "Valued Consignee"))
        safe_delivery_address = html.escape(str(self.order.get("deliveryAddress") or self.order.get("delivery_address") or self.order.get("address") or "Customer Address"))
        safe_city = html.escape(str(self.order.get("city") or "Mumbai"))
        safe_state = html.escape(str(self.order.get("state") or "Maharashtra"))
        safe_pincode = html.escape(str(self.order.get("pincode") or "400001"))
        safe_consignee_phone = html.escape(str(self.order.get("consigneePhone") or self.order.get("consignee_phone") or self.order.get("phone") or "N/A"))
        safe_consignee_email = html.escape(str(self.order.get("consigneeEmail") or self.order.get("consignee_email") or self.order.get("email") or "N/A"))
        safe_gstin = html.escape(str(self.order.get("gstin") or "URP / Consumer"))

        safe_courier_partner = html.escape(str(self.order.get("courierPartner") or self.order.get("courier_partner") or "Surface Express (Pending)"))
        safe_tracking_number = html.escape(str(self.order.get("trackingNumber") or self.order.get("tracking_number") or "In Fulfillment"))
        safe_order_id = html.escape(str(self.order.get("id") or self.order.get("orderId") or ""))
        safe_upi_utr = html.escape(str(self.order.get("upiUtr") or self.order.get("upi_utr") or self.order.get("utr") or "VERIFIED"))
        safe_order_status = html.escape(str(self.order.get("orderStatus") or self.order.get("order_status") or self.order.get("status") or "PROCESSING"))

        return f"""
    <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; font-size: 13px;">
      <div style="flex: 1; background: #f9fafb; padding: 14px; border-radius: 6px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 6px;">Billed To / Consignee:</div>
        <b>{safe_consignee_name}</b><br>
        {safe_delivery_address}<br>
        {safe_city}, {safe_state} - {safe_pincode}<br>
        Phone: {safe_consignee_phone} | Email: {safe_consignee_email}<br>
        GSTIN: {safe_gstin}
      </div>
      <div style="flex: 1; background: #f9fafb; padding: 14px; border-radius: 6px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 6px;">Dispatch & Settlement:</div>
        <b>Courier Partner:</b> {safe_courier_partner}<br>
        <b>Docket / AWB:</b> {safe_tracking_number}<br>
        <b>Order Ref:</b> {safe_order_id}<br>
        <b>UPI UTR:</b> <span style="font-family: monospace;">{safe_upi_utr}</span><br>
        <b>Status:</b> {safe_order_status}
      </div>
    </div>"""

    def build_items_table(self) -> str:
        safe_commodity = html.escape(str(self.order.get("commodity") or "Agricultural Commodity"))
        safe_pack_size = html.escape(str(self.order.get("packSize") or self.order.get("pack_size") or "Standard Pack"))
        try:
            order_qty = max(1, int(self.order.get("quantity") or 1))
        except (ValueError, TypeError):
            order_qty = 1

        tax_rows = (
            f"<tr><td colspan='5' class='text-right'>CGST (2.5%):</td><td class='text-right'>₹{self.tax_result.cgst_amount:.2f}</td></tr>"
            f"<tr><td colspan='5' class='text-right'>SGST (2.5%):</td><td class='text-right'>₹{self.tax_result.sgst_amount:.2f}</td></tr>"
            if self.tax_result.is_intra_state else
            f"<tr><td colspan='5' class='text-right'>IGST (5.0%):</td><td class='text-right'>₹{self.tax_result.igst_amount:.2f}</td></tr>"
        )

        return f"""
    <table>
      <thead>
        <tr>
          <th>Description of Goods</th>
          <th>HSN</th>
          <th>Pack Size</th>
          <th>Qty</th>
          <th class="text-right">Unit Rate (₹)</th>
          <th class="text-right">Taxable Value (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><b>{safe_commodity}</b><br><small style="color:#6b7280;">Sortex Cleaned · Food-Grade Barrier Pouch</small></td>
          <td>{self.tax_result.hsn_code}</td>
          <td>{safe_pack_size}</td>
          <td>{order_qty}</td>
          <td class="text-right">{self.tax_result.rate_per_unit:.2f}</td>
          <td class="text-right">{self.tax_result.taxable_value:.2f}</td>
        </tr>
        <tr>
          <td colspan="5" class="text-right"><b>Taxable Subtotal:</b></td>
          <td class="text-right">₹{self.tax_result.taxable_value:.2f}</td>
        </tr>
        {tax_rows}
        <tr style="background: #fdf8eb; font-weight: bold; font-size: 14px;">
          <td colspan="5" class="text-right" style="color: #B8872F;">Total Invoice Amount (INR):</td>
          <td class="text-right" style="color: #B8872F;">₹{self.tax_result.total_amount:.2f}</td>
        </tr>
      </tbody>
    </table>"""

    def build_tax_summary(self) -> str:
        safe_upi_utr = html.escape(str(self.order.get("upiUtr") or self.order.get("upi_utr") or self.order.get("utr") or "VERIFIED"))
        return f"""
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; font-size: 12px; color: #166534;">
      ✓ <b>Payment Verified:</b> Received ₹{self.tax_result.total_amount:.2f} INR via UPI Instant Settlement (UTR: {safe_upi_utr}). No balance due.
    </div>"""

    def build_signatory_block(self) -> str:
        return f"""
    <div class="footer">
      This is a computer-generated Tax Invoice issued under the Central Goods and Services Tax Act, 2017.<br>
      {self.seller['tradeName']} · Wadala East, Mumbai, Maharashtra 400037 · FSSAI Reg No: {self.seller['fssaiNumber']}
    </div>"""

    def render_html(self) -> str:
        """Assembles all components into the full valid HTML document."""
        safe_inv_no = html.escape(str(self.invoice_number))
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice — {safe_inv_no}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; padding: 24px; margin: 0; }}
    .invoice-box {{ max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }}
    .header {{ display: flex; justify-content: space-between; border-bottom: 2px solid #D9AC52; padding-bottom: 20px; margin-bottom: 24px; }}
    .header h1 {{ margin: 0 0 4px; font-size: 22px; color: #B8872F; letter-spacing: 0.5px; }}
    .badge {{ display: inline-block; background: #166534; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; }}
    table {{ width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }}
    th, td {{ padding: 10px 12px; border: 1px solid #e5e7eb; }}
    th {{ background: #f3f4f6; text-align: left; font-size: 11px; text-transform: uppercase; color: #4b5563; }}
    .text-right {{ text-align: right; }}
    .footer {{ margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #6b7280; text-align: center; }}
    @media print {{ body {{ background: #ffffff; padding: 0; }} .invoice-box {{ box-shadow: none; border: none; padding: 0; }} .no-print {{ display: none; }} }}
  </style>
</head>
<body>
  <div class="invoice-box">
    {self.build_header()}
    {self.build_seller_buyer_details()}
    {self.build_items_table()}
    {self.build_tax_summary()}
    {self.build_signatory_block()}
  </div>
</body>
</html>"""

    def build_payload(self) -> Dict[str, Any]:
        """Constructs standardized JSON representation for API consumption."""
        try:
            order_qty = max(1, int(self.order.get("quantity") or 1))
        except (ValueError, TypeError):
            order_qty = 1
        order_id = str(self.order.get("id") or self.order.get("orderId") or "")

        return {
            "success": True,
            "invoiceNumber": self.invoice_number,
            "invoiceDate": self.invoice_date,
            "orderId": order_id,
            "totalAmount": self.tax_result.total_amount,
            "taxableValue": self.tax_result.taxable_value,
            "totalGst": self.tax_result.total_tax,
            "gstBreakdown": self.tax_result.gst_breakdown,
            "seller": self.seller,
            "consignee": {
                "name": self.order.get("consigneeName") or self.order.get("consignee_name") or self.order.get("name") or "",
                "phone": self.order.get("consigneePhone") or self.order.get("consignee_phone") or self.order.get("phone") or "",
                "email": self.order.get("consigneeEmail") or self.order.get("consignee_email") or self.order.get("email") or "",
                "address": self.order.get("deliveryAddress") or self.order.get("delivery_address") or self.order.get("address") or "",
                "city": self.order.get("city") or "",
                "state": self.order.get("state") or "Maharashtra",
                "pincode": self.order.get("pincode") or "",
                "gstin": self.order.get("gstin") or "UNREGISTERED / CONSUMER"
            },
            "item": {
                "commodity": self.order.get("commodity") or "Agricultural Commodity",
                "hsnCode": self.tax_result.hsn_code,
                "packSize": self.order.get("packSize") or self.order.get("pack_size") or "Standard Pack",
                "quantity": order_qty,
                "ratePerUnit": self.tax_result.rate_per_unit,
                "taxableValue": self.tax_result.taxable_value
            },
            "taxBreakdown": self.tax_result.to_dict(),
            "payment": {
                "mode": "UPI (Unified Payments Interface)",
                "vpa": self.order.get("upiVpa") or self.order.get("upi_vpa") or "goldenglobalexpo@icici",
                "utr": self.order.get("upiUtr") or self.order.get("upi_utr") or self.order.get("utr") or "",
                "paymentStatus": self.order.get("paymentStatus") or self.order.get("payment_status") or "PAID",
                "amountPaid": self.tax_result.total_amount
            },
            "shipping": {
                "courierPartner": self.order.get("courierPartner") or self.order.get("courier_partner") or "",
                "trackingNumber": self.order.get("trackingNumber") or self.order.get("tracking_number") or "",
                "orderStatus": self.order.get("orderStatus") or self.order.get("order_status") or ""
            }
        }

    # Fluent aliases conforming to universal builder interface
    to_dict = build_payload
    build_html = render_html


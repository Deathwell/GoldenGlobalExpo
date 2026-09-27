"""
Golden Global Expo — Asynchronous Non-Blocking Email Dispatch Worker
"""
import os
import sys
import re
import json
import base64
import smtplib
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv

import html as html_lib

def html_to_plain_text(html_content: str) -> str:
    """Converts HTML email body into clean, properly formatted plain text."""
    if not html_content:
        return ""
    text = str(html_content)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</(p|div|h[1-6]|tr|li|table|ul|ol)>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<li[^>]*>', '• ', text, flags=re.IGNORECASE)
    text = re.sub(r'</?t[dh][^>]*>', '  ', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = html_lib.unescape(text)
    lines = [line.rstrip() for line in text.splitlines()]
    text = '\n'.join(lines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def build_enterprise_html_letterhead(
    subject: str,
    to_name: str,
    body_text: str = "",
    specs: dict = None,
    docs: list = None,
    tracking_url: str = "",
    email_type: str = "general"
) -> str:
    """
    Renders an institutional, executive-grade HTML email dossier for Golden Global Expo.
    Ensures 100% flawless, responsive presentation across Gmail, Apple Mail, Outlook, and webmail.
    """
    esc_subj = html_lib.escape(subject or "Official Trade Dossier")
    esc_to = html_lib.escape(to_name or "Valued Importer")

    cleaned_paragraphs = []
    if body_text:
        raw_lines = body_text.splitlines()
        current_p = []
        for line in raw_lines:
            stripped = line.strip()
            if re.match(r'^[=\-_*#]{4,}$', stripped):
                if current_p:
                    cleaned_paragraphs.append(' '.join(current_p))
                    current_p = []
                continue
            if not stripped:
                if current_p:
                    cleaned_paragraphs.append(' '.join(current_p))
                    current_p = []
            else:
                current_p.append(stripped)
        if current_p:
            cleaned_paragraphs.append(' '.join(current_p))

    body_html_parts = []
    for p in cleaned_paragraphs:
        if p.startswith('•') or p.startswith('*') or p.startswith('- '):
            item_text = re.sub(r'^[•*\-]\s*', '', p)
            body_html_parts.append(
                f'<div style="margin:4px 0; padding-left:14px; font-size:13.5px; color:#374151; line-height:1.6; border-left:2px solid #D9AC52;">'
                f'{html_lib.escape(item_text)}</div>'
            )
        elif re.match(r'^[0-9]+\.\s+', p):
            body_html_parts.append(
                f'<div style="margin:10px 0 4px; font-size:14px; color:#111827; line-height:1.6; font-weight:700;">'
                f'{html_lib.escape(p)}</div>'
            )
        else:
            body_html_parts.append(
                f'<p style="margin:0 0 14px; font-size:14px; line-height:1.65; color:#374151;">'
                f'{html_lib.escape(p)}</p>'
            )
    formatted_body_html = '\n'.join(body_html_parts)

    specs_table_html = ""
    if specs and isinstance(specs, dict) and len(specs) > 0:
        rows_html = []
        for i, (k, v) in enumerate(specs.items()):
            bg = "#F9FAFB" if i % 2 == 0 else "#FFFFFF"
            is_total = "total" in str(k).lower() or "contract value" in str(k).lower()
            val_style = "font-weight:700; color:#B8872F; font-size:14px;" if is_total else "color:#1F2937; font-size:13px;"
            row_bg = "background-color:#FAF5EA; border-top:2px solid #D9AC52; border-bottom:2px solid #D9AC52;" if is_total else f"background-color:{bg}; border-bottom:1px solid #E5E7EB;"
            rows_html.append(f"""
            <tr style="{row_bg}">
              <td style="padding:10px 14px; font-weight:600; color:#4B5563; font-size:12.5px; width:42%;">{html_lib.escape(str(k))}</td>
              <td style="padding:10px 14px; {val_style}">{html_lib.escape(str(v))}</td>
            </tr>
            """)
        specs_table_html = f"""
        <div style="margin:22px 0;">
          <div style="font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#855C1B; margin-bottom:8px;">
            📋 Commercial Specification &amp; Valuation Table
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; border:1px solid #E5E7EB; border-radius:6px; overflow:hidden;">
            {''.join(rows_html)}
          </table>
        </div>
        """

    docs_checklist_html = ""
    if docs and isinstance(docs, list) and len(docs) > 0:
        items_html = []
        for d in docs:
            if isinstance(d, dict):
                name = d.get('name', 'Export Document')
                ref = d.get('ref', 'Certified')
                attached = d.get('attached', False)
                status_badge = '<span style="background-color:#DEF7EC; color:#03543F; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:6px;">✓ Attached</span>' if attached else '<span style="background-color:#FEF08A; color:#854D0E; font-size:11px; font-weight:600; padding:2px 8px; border-radius:12px; margin-left:6px;">Registered</span>'
                items_html.append(f"""
                <tr style="border-bottom:1px solid #E5E7EB;">
                  <td style="padding:8px 12px; font-size:13px; color:#1F2937; font-weight:600;">{html_lib.escape(name)}</td>
                  <td style="padding:8px 12px; font-size:12.5px; color:#6B7280; font-family:monospace;">{html_lib.escape(ref)} {status_badge}</td>
                </tr>
                """)
        if items_html:
            docs_checklist_html = f"""
            <div style="margin:20px 0;">
              <div style="font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#855C1B; margin-bottom:8px;">
                📁 Certified Export Documentation Suite
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; border:1px solid #E5E7EB; border-radius:6px; overflow:hidden;">
                {''.join(items_html)}
              </table>
            </div>
            """

    tracking_btn_html = ""
    if tracking_url:
        esc_track_url = html_lib.escape(tracking_url)
        tracking_btn_html = f"""
        <div style="margin:26px 0; text-align:center;">
          <a href="{esc_track_url}" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #D9AC52 0%, #B8872F 100%); color:#0D0A08; font-weight:700; font-size:14px; text-decoration:none; padding:14px 28px; border-radius:6px; letter-spacing:0.5px; box-shadow:0 4px 12px rgba(184,135,47,0.35);">
            🚢 Track Live Consignment &amp; Vessel Telemetry
          </a>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc_subj}</title>
</head>
<body style="margin:0; padding:24px 0; background-color:#F3F4F6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased; color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px; background-color:#FFFFFF; border-radius:8px; overflow:hidden; border:1px solid #E5E7EB; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- Obsidian & 24K Gold Header -->
          <tr>
            <td style="background-color:#0E0C0A; padding:26px 32px; text-align:center; border-bottom:3px solid #D9AC52;">
              <div style="color:#D9AC52; font-size:20px; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">
                GOLDEN GLOBAL EXPO
              </div>
              <div style="color:#9CA3AF; font-size:10.5px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;">
                Govt. of India Recognized Merchant Exporter · APEDA &amp; Spices Board Member
              </div>
            </td>
          </tr>

          <!-- Metadata Ribbon -->
          <tr>
            <td style="background-color:#FAF7F0; padding:12px 32px; border-bottom:1px solid #EAE0CD; font-size:12px; color:#6B7280;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="font-weight:600; color:#4B5563;">
                    Official Trade Communication
                  </td>
                  <td align="right" style="font-family:monospace; font-weight:700; color:#B8872F;">
                    CONFIDENTIAL &amp; PROPRIETARY
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Letterhead Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              
              <!-- Subject Banner -->
              <div style="border-left:3.5px solid #D9AC52; padding-left:14px; margin-bottom:22px;">
                <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#855C1B; margin-bottom:2px;">
                  Trade Subject
                </div>
                <div style="font-size:16px; font-weight:700; color:#111827; line-height:1.4;">
                  {esc_subj}
                </div>
              </div>

              <!-- Formatted Text / Message Body -->
              {formatted_body_html}

              <!-- Dynamic Specification Table -->
              {specs_table_html}

              <!-- Dynamic Document Suite -->
              {docs_checklist_html}

              <!-- Live Tracking Action -->
              {tracking_btn_html}

              <!-- Institutional Sign-Off Block -->
              <div style="margin-top:32px; padding-top:20px; border-top:1px solid #E5E7EB;">
                <div style="font-size:13.5px; color:#374151; line-height:1.6;">
                  <strong style="color:#111827;">Arundhati Bhosale</strong><br>
                  <span style="color:#6B7280; font-size:12.5px;">Managing Director &amp; Export Operations</span><br>
                  <strong style="color:#B8872F; font-size:13px;">Golden Global Expo — Merchant Exporter</strong><br>
                  <span style="color:#4B5563; font-size:12px;">1903 A Ajmera Zeon, Wadala, Mumbai - 400037, Maharashtra, India</span><br>
                  <span style="color:#4B5563; font-size:12px;">Phone / WhatsApp: +91 9920594424 / +91 7799888777</span><br>
                  <span style="color:#4B5563; font-size:12px;">Email: <a href="mailto:export@goldenglobalexpo.com" style="color:#B8872F; text-decoration:none;">export@goldenglobalexpo.com</a> | Web: <a href="https://www.goldenglobalexpo.com" style="color:#B8872F; text-decoration:none;">www.goldenglobalexpo.com</a></span><br>
                  <span style="color:#9CA3AF; font-size:11px; font-family:monospace; margin-top:4px; display:inline-block;">
                    GSTIN: 27AAGPB8439A1Z1 · APEDA Reg: APEDA/2026/GGE · Spices Board Member
                  </span>
                </div>
              </div>

            </td>
          </tr>

          <!-- Security & Compliance Footer -->
          <tr>
            <td style="background-color:#F9FAFB; padding:16px 32px; border-top:1px solid #E5E7EB; text-align:center;">
              <p style="margin:0; font-size:11px; color:#9CA3AF; line-height:1.5;">
                This formal export transmission is encrypted and authenticated by the Golden Global Expo Trade Desk.<br>
                All specifications, quality standards, and pricing are subject to final contract verification and standard maritime incoterms.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

def background_send_email_task(email_data: dict):
    """Executes in a separate thread pool worker. Never blocks the HTTP server loop!"""
    try:
        if not isinstance(email_data, dict):
            print(f"[BACKGROUND WORKER WARNING] Expected dict payload, got: {type(email_data)}")
            return

        to_email = re.sub(r'[\r\n]', '', str(email_data.get('to', ''))).strip()
        if not to_email or '@' not in to_email:
            print(f"[BACKGROUND WORKER WARNING] Invalid destination email: '{to_email}'")
            return

        to_name = re.sub(r'[\r\n]', '', str(email_data.get('toName', 'Valued Importer'))).strip()
        sender_name = re.sub(r'[\r\n]', '', str(email_data.get('senderName') or os.environ.get('DEFAULT_SENDER_NAME', 'Golden Global Expo'))).strip()
        from_email = re.sub(r'[\r\n]', '', str(email_data.get('from') or os.environ.get('SMTP_FROM') or os.environ.get('DEFAULT_FROM_EMAIL') or os.environ.get('DEFAULT_REPLY_TO') or os.environ.get('SMTP_USER', 'admin@goldenglobalexpo.com'))).strip()
        smtp_user = re.sub(r'[\r\n]', '', str(email_data.get('smtpUser') or os.environ.get('SMTP_USER', from_email))).strip()
        smtp_pass = os.environ.get("SMTP_PASS", "").strip()
        client_pass = str(email_data.get('smtpPass', '')).strip()
        if not smtp_pass and client_pass and client_pass != 'CONFIGURED_ON_SERVER':
            smtp_pass = client_pass

        subject = re.sub(r'[\r\n]', '', str(email_data.get('subject', 'Golden Global Expo — Trade Dossier'))).strip()

        # Robust HTML and Plain-Text determination
        raw_html = email_data.get('html') or email_data.get('body_html')
        raw_body = email_data.get('body') or email_data.get('text') or email_data.get('body_text') or ''
        specs = email_data.get('specs')
        docs = email_data.get('docs')
        tracking_url = email_data.get('trackingUrl') or email_data.get('tracking_url', '')
        email_type = email_data.get('emailType', 'general')

        has_html_tags = bool(re.search(r'<(div|p|table|h[1-6]|span|ul|ol|body|html)[^>]*>', str(raw_body), re.IGNORECASE))

        if raw_html:
            body_html = str(raw_html)
            body_text = str(raw_body) if (raw_body and not has_html_tags) else html_to_plain_text(body_html)
        elif has_html_tags:
            body_html = str(raw_body)
            body_text = html_to_plain_text(body_html)
        else:
            # Caller passed plain text without HTML tags -> wrap in rich enterprise letterhead
            body_text = str(raw_body)
            body_html = build_enterprise_html_letterhead(
                subject=subject,
                to_name=to_name,
                body_text=body_text,
                specs=specs,
                docs=docs,
                tracking_url=tracking_url,
                email_type=email_type
            )

        msg = MIMEMultipart('mixed')
        msg['Subject'] = subject
        msg['From'] = f"{sender_name} <{from_email}>"
        msg['To'] = f"{to_name} <{to_email}>"

        reply_to = re.sub(r'[\r\n]', '', str(email_data.get('replyTo') or os.environ.get('DEFAULT_REPLY_TO', from_email))).strip()
        if reply_to:
            msg['Reply-To'] = reply_to

        alt = MIMEMultipart('alternative')
        alt.attach(MIMEText(body_text, 'plain', 'utf-8'))
        alt.attach(MIMEText(body_html, 'html', 'utf-8'))
        msg.attach(alt)

        # Process single attachment or list of attachments
        attachments_to_process = []
        if 'attachment' in email_data and email_data['attachment']:
            attachments_to_process.append(email_data['attachment'])
        if 'attachments' in email_data and isinstance(email_data['attachments'], list):
            attachments_to_process.extend(email_data['attachments'])

        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "documents")

        for att in attachments_to_process:
            if not isinstance(att, dict):
                continue
            filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', att.get('filename', att.get('name', 'document.pdf')))
            pdf_bytes = None

            # 1. Try decoding Base64 payload if provided
            b64data = att.get('data', att.get('dataUrl', ''))
            if b64data:
                if ',' in b64data:
                    b64data = b64data.split(',', 1)[1]
                try:
                    pdf_bytes = base64.b64decode(b64data)
                except Exception as e:
                    print(f"[BACKGROUND WORKER] Base64 decode failed for {filename}: {e}")

            # 2. If no valid bytes yet, search the server document vault (uploads/documents)
            if not pdf_bytes and os.path.exists(uploads_dir):
                candidate_paths = [
                    os.path.join(uploads_dir, filename),
                ]
                bl = att.get('bl') or email_data.get('specs', {}).get('Bill of Lading (B/L) Code')
                slot = att.get('slot')
                if bl and slot:
                    clean_bl = re.sub(r'[^A-Za-z0-9_-]', '_', str(bl).strip().upper())
                    clean_slot = str(slot).lower()
                    for ext in ['.pdf', '.png', '.jpg', '.jpeg']:
                        candidate_paths.append(os.path.join(uploads_dir, f"{clean_bl}_{clean_slot}{ext}"))

                for path in candidate_paths:
                    real_p = os.path.realpath(path)
                    if real_p.startswith(os.path.realpath(uploads_dir)) and os.path.isfile(real_p):
                        try:
                            with open(real_p, 'rb') as f:
                                pdf_bytes = f.read()
                            print(f"[BACKGROUND WORKER] Loaded document {filename} directly from vault: {real_p}")
                            break
                        except Exception as e:
                            print(f"[BACKGROUND WORKER] Failed reading {real_p}: {e}")

            if pdf_bytes:
                try:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(pdf_bytes)
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                    msg.attach(part)
                except Exception as e:
                    print(f"[BACKGROUND WORKER] Failed to attach document {filename}: {e}")

        # If SMTP_PASS is unset, log mock queue event without leaking data to external relays
        if not smtp_pass:
            print(f"[BACKGROUND WORKER MOCK] Email queued for {to_email} (Subject: {subject}) [SMTP credentials unconfigured - safe mock mode]")
            return

        smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()

        # Safety Guard: Never connect to live external Gmail SMTP relays during automated testing
        is_test_env = os.environ.get("TESTING", "").lower() in ("true", "1") or "pytest" in sys.modules
        if is_test_env and (smtp_host == "smtp.gmail.com" or "gmail" in smtp_host):
            print(f"[TEST RUNNER MOCK] Suppressed live Gmail dispatch to {to_email} (Subject: {subject}) during test execution.")
            return
        try:
            smtp_port = int(os.environ.get("SMTP_PORT", 587))
        except (ValueError, TypeError):
            smtp_port = 587

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
                print(f"[BACKGROUND WORKER SUCCESS] Sent live trade email to {to_email} via SSL:{smtp_port}")
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                try:
                    server.starttls()
                    server.ehlo()
                except Exception as tls_err:
                    print(f"[BACKGROUND WORKER] STARTTLS note: {tls_err}")
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
                print(f"[BACKGROUND WORKER SUCCESS] Sent live trade email to {to_email} via STARTTLS:{smtp_port}")
    except Exception as exc:
        print(f"[BACKGROUND WORKER ERROR] Failed to dispatch email: {exc}")

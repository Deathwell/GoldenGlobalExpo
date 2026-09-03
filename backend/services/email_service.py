"""
Golden Global Expo — Asynchronous Non-Blocking Email Dispatch Worker
"""
import os
import re
import base64
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

def background_send_email_task(email_data: dict):
    """Executes in a separate thread pool worker. Never blocks the HTTP server loop!"""
    try:
        to_email = re.sub(r'[\r\n]', '', str(email_data.get('to', ''))).strip()
        to_name = re.sub(r'[\r\n]', '', str(email_data.get('toName', 'Valued Importer'))).strip()
        from_email = re.sub(r'[\r\n]', '', str(email_data.get('from', 'nigadearyan@gmail.com'))).strip()
        smtp_user = re.sub(r'[\r\n]', '', str(email_data.get('smtpUser', from_email))).strip()
        smtp_pass = os.environ.get("SMTP_PASS", "")

        subject = re.sub(r'[\r\n]', '', str(email_data.get('subject', 'Golden Global Expo — Trade Dossier'))).strip()
        body_html = str(email_data.get('body', email_data.get('html', '')))
        body_text = re.sub(r'<[^>]+>', ' ', body_html).strip()

        msg = MIMEMultipart('mixed')
        msg['Subject'] = subject
        msg['From'] = f"Golden Global Expo <{from_email}>"
        msg['To'] = f"{to_name} <{to_email}>"

        alt = MIMEMultipart('alternative')
        alt.attach(MIMEText(body_text, 'plain', 'utf-8'))
        alt.attach(MIMEText(body_html, 'html', 'utf-8'))
        msg.attach(alt)

        if 'attachment' in email_data and email_data['attachment']:
            att = email_data['attachment']
            filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', att.get('filename', 'document.pdf'))
            b64data = att.get('data', '')
            if ',' in b64data:
                b64data = b64data.split(',', 1)[1]
            try:
                pdf_bytes = base64.b64decode(b64data)
                part = MIMEBase('application', 'pdf')
                part.set_payload(pdf_bytes)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                msg.attach(part)
            except Exception as e:
                print(f"[BACKGROUND WORKER] Failed to attach PDF: {e}")

        if not smtp_pass:
            print(f"[BACKGROUND WORKER MOCK] Email queued for {to_email} (Subject: {subject})")
            return

        smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", 587))
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            print(f"[BACKGROUND WORKER SUCCESS] Sent live trade email to {to_email}")
    except Exception as exc:
        print(f"[BACKGROUND WORKER ERROR] Failed to dispatch email: {exc}")

# Golden Global Expo — Executive Handover & Enterprise Operations Manual
**Institutional Agricultural Export Trading Platform & Digital Trade Desk**  
*Client Deliverable — Tier-1 Production Runbook ($100k USD Enterprise Contract)*  
*Division: International Trade & Agricultural Export Division (Six Lady Farmers)*  
*Operating Port: JNPT / Nhava Sheva (INNSA1), Mumbai, India*  
*Document Version: 5.0.0 (Release Candidate — Final Handover)*  
*Date: September 2026*

---

## Executive Summary & System Overview

Golden Global Expo (GGE) is an enterprise-grade digital trade desk and export operations terminal engineered for institutional cross-border commodity trading. Headquartered in Maharashtra with deep agricultural corridors spanning Karnataka, Rajasthan, and Madhya Pradesh, the terminal digitizes the entire international export lifecycle:

1. **High-Value Buyer Acquisition & Telemetry**: Live multi-lingual storefront tracking international importer dwell time, scroll depth, visited commodity lots, and abandoned RFQ drafts.
2. **Dynamic Commodity Catalog & Assays Console**: Live quality benchmarks (Purity Sortex %, Moisture %, Foreign Matter %, Protein %) with digital attachment of NABL/SGS Certificates of Analysis (COA).
3. **Institutional Document Engine**: Automated server-side generation of ICC Incoterms® 2020 Proforma Invoices and Commercial Packing Lists conforming to DGFT IEC (`AAGPB8439A`), APEDA, FSSAI (`10024022000841`), and SWIFT MT103 wire transfer coordinates.
4. **Maritime & Air Courier Logistics Engine**: Bill of Lading (B/L) milestone tracking, container seal verification, and automated customer tracking dossiers.
5. **Zero-Trust Security & Multi-Role Governance**: 2-Step Email OTP authentication, timing-safe cryptographic password verification, multi-worker Redis rate-limiting with ACID database lock fallbacks, and immutable SHA-256 tamper-evident audit logging.

---

## 1. System Architecture & Topology Diagram

```mermaid
graph TD
    subgraph Client Tier [Global Buyers & Trade Desk Operators]
        B1[International Buyers<br/>Dubai, Rotterdam, Singapore]
        B2[Domestic Retail & Wholesale Importers]
        A1[Executive Trade Desk<br/>desk.html]
    end

    subgraph Edge & Security Tier [Nginx Reverse Proxy & SSL Termination]
        NG[Nginx 1.25+ Alpine<br/>Port 80/443 SSL Termination]
        WAF[OWASP Headers & SSL Security Guard<br/>HSTS, CSP, Frame-Options]
        CACHE[Static Asset Cache<br/>CSS, JS, WebP Images]
    end

    subgraph Application Tier [FastAPI ASGI Cluster - Non-Root Context]
        UVI[Uvicorn Master Worker Process]
        W1[FastAPI Worker 1]
        W2[FastAPI Worker 2]
        W3[FastAPI Worker 3]
        W4[FastAPI Worker 4]
        RL[Multi-Worker Rate Limiter<br/>Redis Adapter + DB Lock Fallback]
    end

    subgraph Business Logic & Document Engines
        DOC[Document Generation Engine<br/>Proforma Invoice & Packing List]
        CAT[Commodity Catalog & Assays<br/>CRUD + COA PDF Manager]
        CRM[Inquiry & Lead Management CRM]
        LOG[Maritime Consignments & Tracking]
        SSE[Server-Sent Events Broadcast Engine]
    end

    subgraph Data & Storage Tier
        PG[(PostgreSQL 16 Enterprise<br/>Production Database)]
        SQLITE[(SQLite 3 ACID WAL<br/>Fallback/Development Engine)]
        AUDIT[(SHA-256 Tamper-Evident<br/>Audit Ledger)]
        UPLOADS[Encrypted Document Vault<br/>/uploads/certificates & /documents]
    end

    B1 -->|HTTPS / WSS| NG
    B2 -->|HTTPS| NG
    A1 -->|HTTPS / 2FA OTP| NG

    NG --> WAF
    NG --> CACHE
    WAF --> UVI

    UVI --> W1
    UVI --> W2
    UVI --> W3
    UVI --> W4

    W1 & W2 & W3 & W4 --> RL
    W1 & W2 & W3 & W4 --> DOC
    W1 & W2 & W3 & W4 --> CAT
    W1 & W2 & W3 & W4 --> CRM
    W1 & W2 & W3 & W4 --> LOG
    W1 & W2 & W3 & W4 --> SSE

    DOC & CAT & CRM & LOG --> PG
    DOC & CAT & CRM & LOG -.->|Dev Fallback| SQLITE
    CRM & LOG & CAT --> AUDIT
    CAT --> UPLOADS
```

---

## 2. 1-Command Production Deployment Guide

The platform is fully containerized using Docker and Docker Compose, supporting zero-downtime rolling deployments on Ubuntu 22.04/24.04 LTS, AWS EC2, or DigitalOcean Droplets.

### System Prerequisites
- **Operating System**: Ubuntu 22.04 LTS or 24.04 LTS (x86_64)
- **Minimum Compute**: 2 vCPU, 4 GB RAM, 40 GB NVMe SSD
- **Software**: Docker Engine 24.0+ & Docker Compose v2.20+
- **Open Inbound Ports**: `80` (HTTP), `443` (HTTPS), `22` (SSH)

### 1-Command Launch Script
Clone repository and execute the production launch orchestrator:

```bash
# 1. Clone the repository
git clone https://github.com/goldenglobalexpo/platform.git /opt/goldenglobalexpo
cd /opt/goldenglobalexpo

# 2. Configure Production Secrets
cp .env.example .env
nano .env  # Populate ADMIN_PASSWORD, POSTGRES_PASSWORD, JWT_SECRET, etc.

# 3. Launch Enterprise Multi-Container Stack in Production
docker compose -f docker-compose.prod.yml up -d --build
```

### Verification & Health Probe
Verify all containers are active, healthy, and communicating:

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Inspect backend service health check
curl -f http://localhost:8000/api/health

# Verify live APM database response time
curl -s http://localhost:8000/api/health | jq .
# Expected output:
# {
#   "status": "healthy",
#   "environment": "production",
#   "db_engine": "postgresql",
#   "db_latency_ms": 0.82
# }
```

### Systemd Auto-Recovery Service (Production Resilience)
To ensure the container cluster auto-recovers after physical server reboots, install the systemd unit:

```bash
sudo tee /etc/systemd/system/goldenglobalexpo.service > /dev/null <<EOF
[Unit]
Description=Golden Global Expo Enterprise Production Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/goldenglobalexpo
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable goldenglobalexpo.service
```

---

## 3. Environment Variables & Secrets Vault Reference

All sensitive parameters are environment-driven. **Never hardcode secrets into source code or commit `.env` to Git.**

| Variable Name | Required | Default / Format | Description & Security Purpose |
|---|---|---|---|
| `ENVIRONMENT` | **Yes** | `production` | Enables production security controls, disables Swagger docs and dev bypasses. |
| `DEBUG` | **Yes** | `False` | Disables stack traces in client HTTP responses. |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/db` | Connection URI. Supports PostgreSQL (pooling) or SQLite WAL (`sqlite:///./data/platform.db`). |
| `DB_POOL_SIZE` | No | `10` | SQLAlchemy persistent connection pool size. |
| `DB_MAX_OVERFLOW`| No | `20` | SQLAlchemy connection overflow ceiling under burst traffic. |
| `ADMIN_PASSWORD` | **Yes** | High-entropy string | Master executive password for Trade Desk access. Verified via `hmac.compare_digest`. |
| `LOGISTICS_PASSWORD`| **Yes**| High-entropy string | Restricted password for freight forwarders and logistics officers. |
| `MASTER_SECURITY_KEY`| No | Blank / Disabled | **Zero Hardcoding Mandate**: Emergency bypass key. Disabled by default in production. If set, triggers cryptographic alert. |
| `JWT_SECRET` | **Yes** | 64-char Hex String | Key for HMAC-SHA256 session token generation and verification. |
| `SESSION_EXPIRE_SECONDS`| No| `86400` (24h) | Executive session timeout window. |
| `SMTP_HOST` | No | `smtp.gmail.com` | Outbound TLS mail server for dispatching PIs and OTPs. |
| `SMTP_PORT` | No | `587` | Outbound mail port. |
| `SMTP_USER` | No | `admin@goldenglobalexpo.com` | Authorized sending corporate email. |
| `SMTP_PASS` | No | Google App Password (16 chars) | Secure application-specific password. |
| `RAZORPAY_KEY_ID`| No | `rzp_live_...` | Razorpay Merchant ID for domestic UPI sample checkout. |
| `RAZORPAY_KEY_SECRET`| No | Live Secret | Secret key for verifying order generation. |
| `RAZORPAY_WEBHOOK_SECRET`| No | Webhook Secret | Secret for timing-safe signature verification on inbound webhooks. |

---

## 4. Database Maintenance, Snapshotting & Disaster Recovery

The system features dual-engine capabilities: **PostgreSQL 16** for high-volume multi-container deployments and **SQLite 3 ACID WAL** for self-contained single-node setups.

### PostgreSQL Automated Backup Routine (Nightly Cron)

```bash
#!/bin/bash
# /opt/scripts/backup_postgres.sh
BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Execute dump inside container with compression
docker exec -t gge_postgres_prod pg_dump -U gge_admin -d gge_production -F c -b -v -f "/var/lib/postgresql/data/backup_${DATE}.dump"
mv /var/lib/docker/volumes/opt_postgres_data/_data/backup_${DATE}.dump "${BACKUP_DIR}/"

# Retain rolling 30-day backups
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +30 -exec rm {} +
echo "Backup completed: ${BACKUP_DIR}/backup_${DATE}.dump"
```

### PostgreSQL Disaster Recovery & Restoration Drill

To restore from a snapshot file:

```bash
# 1. Stop backend application to prevent write conflicts
docker stop gge_backend_prod

# 2. Terminate existing connections and drop database
docker exec -i gge_postgres_prod psql -U gge_admin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='gge_production';"
docker exec -i gge_postgres_prod dropdb -U gge_admin gge_production
docker exec -i gge_postgres_prod createdb -U gge_admin gge_production

# 3. Restore from compressed dump
cat /opt/backups/postgres/backup_TARGET.dump | docker exec -i gge_postgres_prod pg_restore -U gge_admin -d gge_production -v

# 4. Restart backend application
docker start gge_backend_prod
```

### SQLite WAL Mode Maintenance (If Running Without Postgres)
When utilizing SQLite, the database operates in WAL (Write-Ahead Logging) mode with `PRAGMA synchronous = NORMAL`. For live backups without stopping the service:

```bash
# Perform live online SQLite snapshot using VACUUM INTO
python -c "
import sqlite3
con = sqlite3.connect('data/platform.db')
con.execute('VACUUM INTO \"data/snapshots/platform_backup.db\"')
con.close()
print('ACID WAL live snapshot created successfully.')
"
```

---

## 5. Trade Desk Daily Operating Procedures

The Executive Trade Desk (`/desk.html`) is the nerve center of all commercial and logistics operations.

### Procedure 1: Logging In & Authentication
1. Navigate to `https://goldenglobalexpo.com/desk.html`.
2. Input registered authorized admin email (`admin@goldenglobalexpo.com` or `nigadearyan@gmail.com`).
3. Click **"Send 6-Digit Security Code ➔"**.
4. Retrieve the one-time passcode from your corporate Gmail inbox and enter the 6 digits.
5. The portal validates the code against the database, provisions a secure session token, and unlocks the operational desk.

### Procedure 2: Managing Inbound RFQs & 1-Click Proforma Invoices (PI)
1. Navigate to the **📬 Inquiry Desk & CRM** tab.
2. Inbound leads from Dubai, Europe, Singapore, and the US appear automatically via real-time SSE stream.
3. To generate an official international export contract:
   - Locate the buyer row in the table.
   - Click the **"📄 Proforma Invoice (PI)"** action button.
   - The backend server calls `POST /api/documents/proforma-invoice`, calculates line-item subtotal, CIF maritime freight, transit marine insurance, DGFT IEC coordinates, and SWIFT MT103 wire coordinates.
   - A modal preview renders the official document with legal seals.
   - Click **"🖨️ Print / Save PDF"** to produce an official print-ready PDF, or click **"📥 Download HTML"** to export the document for client filing.

### Procedure 3: Converting Leads to Ocean Bills of Lading (B/L)
1. On any inquiry row in the CRM table, click **"🚢 Issue B/L ➔"**.
2. The consignment modal pre-populates with buyer company, consignee name, destination port, and commodity lot.
3. Input the Master B/L number (e.g., `MSCU910293-4`), Sea Carrier (e.g., `MSC Mediterranean Shipping Company`), Container Number, and Customs Seal Number.
4. Check **"Automatically notify buyer with consignment tracking dossier and documents via email"**.
5. Click **"Save & Dispatch Consignment ➔"**.
6. The shipment immediately becomes trackable in real-time at `https://goldenglobalexpo.com/tracking.html?bl=YOUR_BL`.

### Procedure 4: Managing the Dynamic Commodity Catalog & Quality Assays
1. Navigate to the **🌾 Commodity Catalog & Quality Assays** tab.
2. To register a new commodity:
   - Click **"+ Register New Commodity"**.
   - Input Commodity Code (e.g., `p18`), Name, Botanical name, HS Tariff Code, Origin belt, Crop year, and Harvest season.
   - Define statutory assay benchmarks: **Sortex Purity %** (e.g., `99.7% Min`), **Moisture %** (e.g., `10.5% Max`), **Foreign Matter %**, and **Protein %**.
   - Set Base USD Price ($/MT) and domestic retail pack pricing (500g, 1kg, 5kg, 25kg).
   - Click **"Save Commodity Specifications ➔"**.
3. To attach a Certificate of Analysis (COA) / Lab Test Report:
   - On the commodity row, click **"📎 Attach COA"** (or **"Update"**).
   - Select the official laboratory PDF (NABL accredited, SGS, or Bureau Veritas).
   - Click **"Upload & Attach COA ➔"**. The server validates file integrity, stores the PDF in `/uploads/certificates`, and creates a direct download link on both the Trade Desk and the live public storefront.

### Procedure 5: Live Importer Telemetry & High-Intent Abandoned RFQs
1. Navigate to the **📊 Live Buyer Analytics & Telemetry** tab.
2. The terminal displays real-time sessions from international commercial buyers.
3. Review high-intent flags (sessions exceeding 5 minutes dwell time or downloading multiple technical COA PDFs).
4. If an importer began filling out an RFQ form in the Dubai/Tokyo timezones and abandoned it, click **"Convert Draft into Active RFQ"** to capture the draft into your active sales pipeline and follow up immediately.

---

## 6. Regulatory & Statutory Accreditations Matrix

All documents and technical dossiers produced by Golden Global Expo carry legal weight under Indian export law and International Maritime Organization (IMO) conventions:

| Authority / Standard | Statutory Reference | Verification Channel | Operational Role |
|---|---|---|---|
| **DGFT (Govt. of India)** | Import Export Code: `AAGPB8439A` | [dgft.gov.in](https://dgft.gov.in) | Primary Legal License for Merchant Export |
| **APEDA** | RCMC: `APEDA/2026/GGE/PULSES` | [apeda.gov.in](https://apeda.gov.in) | Pulses, Grains & Seeds Export Quality Mandate |
| **FSSAI** | Central License: `10024022000841` | [foscos.fssai.gov.in](https://foscos.fssai.gov.in) | Food Safety & Sortex Grading Compliance |
| **Spices Board India** | CRES: `SB/EX/2026/GGE-441` | [indianspices.com](https://indianspices.com) | Whole Spices & Organic Seeds Phytosanitary Clearance |
| **ICC Incoterms® 2020** | FOB JNPT / CIF Global Ports | [iccwbo.org](https://iccwbo.org) | Maritime Transfer of Risk & Title Regulations |
| **SWIFT Banking Rail** | MT103 Commercial Wire | Bank of Baroda / SBI JNPT | Institutional Irrevocable Letters of Credit (L/C) |

---

## 7. Emergency Runbook & Incident Response

### Symptom A: Admin Locked Out / OTP Email Not Arriving
1. Ensure the email entered is on the whitelist (`admin@goldenglobalexpo.com` or `nigadearyan@gmail.com`).
2. If outbound SMTP is temporarily blocked by ISP or Gmail rate limits:
   - Check application server logs: `docker logs gge_backend_prod --tail 50`.
   - The server prints the active OTP directly into stdout: `[2FA SECURITY DISPATCH] 6-Digit Passcode: [XXXXXX]`.
   - Input this code into the portal to authenticate.
3. If an emergency physical break-glass is required:
   - Configure `MASTER_SECURITY_KEY` in `.env` and restart the container.
   - Enter your email and the emergency key into the OTP prompt. The system grants instant administrative access and writes a high-priority tamper-evident audit record `SECURITY_ALERT_MASTER_BYPASS_INVOKED`.

### Symptom B: Database Connectivity Latency High (>50ms)
1. Check live APM badge on the Trade Desk header.
2. In PostgreSQL: inspect connection count via `docker exec -it gge_postgres_prod psql -U gge_admin -d gge_production -c "SELECT count(*) FROM pg_stat_activity;"`.
3. In SQLite: verify WAL file size (`data/platform.db-wal`). If exceeding 50MB, force a checkpoint:
   ```bash
   python -c "import sqlite3; con = sqlite3.connect('data/platform.db'); con.execute('PRAGMA wal_checkpoint(TRUNCATE)'); con.close(); print('WAL truncated.')"
   ```

---
*Manual compiled and certified for executive handover to Institutional Client.*  
*Golden Global Expo Engineering Team · September 2026*

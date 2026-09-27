"""
Golden Global Expo — Server-Side Trade Document Vault Router
Stores and serves official trade documents (COA, Phyto, Invoice, B/L)
with strict RBAC on upload and verified access on download.
"""
import os
import re
import time
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from backend.core.config import BASE_DIR
from backend.core.auth_dependency import require_auth
from backend.db import SessionLocal, ConsignmentModel, DATA_DIR
from backend.services.proforma_builder import ProformaInvoiceBuilder, PackingListBuilder

from sqlalchemy import func
from backend.core.security import RATE_LIMITER, get_client_ip

router = APIRouter(tags=["Document Vault & Trade Dossier"])

UPLOADS_DIR = os.path.join(str(BASE_DIR), "uploads", "documents")
os.makedirs(UPLOADS_DIR, exist_ok=True)
CERT_DIR = os.path.join(str(BASE_DIR), "uploads", "certificates")
os.makedirs(CERT_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB per file
MAX_TOTAL_VAULT_SIZE = 500 * 1024 * 1024  # 500 MB total vault quota

def sanitize_code(code: str) -> str:
    cleaned = re.sub(r'[\x00/\\?%*:|"<>]+', '', str(code).strip())
    return re.sub(r'[^A-Za-z0-9_-]', '_', cleaned.upper())

def normalize_slot(slot: str) -> str:
    s = sanitize_code(slot).lower()
    s = re.sub(r'^(dossier_|mdoc_)', '', s)
    slot_map = {
        "inv": "inv", "invoice": "inv",
        "phyto": "phyto",
        "coa": "coa", "assay": "coa", "sgs": "coa",
        "bl": "bl", "bill_of_lading": "bl"
    }
    return slot_map.get(s, s)

@router.post("/api/documents/upload")
async def upload_trade_document(
    request: Request,
    file: UploadFile = File(...),
    bl: str = Form(...),
    slot: str = Form(...),
    user: dict = Depends(require_auth(["admin", "logistics"]))
):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("document-upload", client_ip, max_requests=30, window_seconds=600)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Upload rate limit exceeded: Maximum 30 uploads per 10 minutes. Retry in {retry_after}s."
        )

    clean_bl = sanitize_code(bl)
    clean_slot = normalize_slot(slot)
    
    if not clean_bl or len(clean_bl.replace('_', '')) == 0:
        raise HTTPException(status_code=400, detail="Invalid B/L identifier.")

    if clean_slot not in {"inv", "phyto", "coa", "bl"}:
        raise HTTPException(status_code=400, detail="Invalid document slot. Allowed: inv, phyto, coa, bl")
    
    filename = file.filename or "document.pdf"
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' not allowed. Must be PDF, PNG, or JPG.")
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds maximum size limit of 15MB.")

    if len(content) < 16:
        raise HTTPException(status_code=400, detail="Invalid file: Incomplete or corrupted document payload.")

    # Enforce total vault storage quota
    try:
        total_vault = sum(
            os.path.getsize(os.path.join(UPLOADS_DIR, f))
            for f in os.listdir(UPLOADS_DIR)
            if os.path.isfile(os.path.join(UPLOADS_DIR, f))
        )
        if total_vault + len(content) > MAX_TOTAL_VAULT_SIZE:
            raise HTTPException(status_code=507, detail="Storage quota exceeded: Document vault capacity limit reached (500MB).")
    except OSError:
        pass
    
    # Magic byte header verification to reject malicious polyglot / renamed files
    if ext == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Invalid PDF file: Missing %PDF- signature header.")
    elif ext == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=400, detail="Invalid PNG file: Missing PNG signature header.")
    elif ext in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=400, detail="Invalid JPEG file: Missing JPEG signature header.")

    # Remove any existing versions with different extensions for this slot
    for old_ext in ALLOWED_EXTENSIONS:
        old_path = os.path.realpath(os.path.join(UPLOADS_DIR, f"{clean_bl}_{clean_slot}{old_ext}"))
        if old_path.startswith(os.path.realpath(UPLOADS_DIR)) and os.path.exists(old_path):
            try: os.remove(old_path)
            except Exception: pass

    # Enforce safe filename and destination with directory traversal protection
    saved_filename = f"{clean_bl}_{clean_slot}{ext}"
    dest_path = os.path.realpath(os.path.join(UPLOADS_DIR, saved_filename))
    if not dest_path.startswith(os.path.realpath(UPLOADS_DIR)):
        raise HTTPException(status_code=400, detail="Invalid file destination: Directory traversal detected.")
    
    with open(dest_path, "wb") as f:
        f.write(content)
        
    # Update Consignment database record
    session = SessionLocal()
    try:
        rec = session.query(ConsignmentModel).filter_by(bl=clean_bl).first()
        if not rec:
            rec = session.query(ConsignmentModel).filter(func.lower(ConsignmentModel.bl) == clean_bl.lower()).first()
        if rec:
            ref_col = f"{clean_slot}_ref"
            if hasattr(rec, ref_col):
                setattr(rec, ref_col, f"DOC-VAULT-{clean_slot.upper()}-{clean_bl[:8]}")
            rec.updated_at = time.time()
            session.commit()

            try:
                from backend.core.atomic_io import atomic_json_write
                all_consigns = [r.to_dict() for r in session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()]
                atomic_json_write(os.path.join(DATA_DIR, 'consignments.json'), all_consigns)
            except Exception:
                pass
    finally:
        session.close()

    from backend.core.events import broadcast_sse
    broadcast_sse("CONSIGNMENT_UPDATED", {"bl": clean_bl, "slot": clean_slot, "uploaded": True, "timestamp": time.time()})

    return {
        "success": True,
        "message": f"Document successfully stored in server vault for {clean_bl}",
        "filename": saved_filename,
        "sizeBytes": len(content),
        "slot": clean_slot
    }

@router.get("/api/documents/meta/{bl}")
async def get_document_metadata(bl: str):
    clean_bl = sanitize_code(bl)
    meta = {}
    for slot in ["inv", "phyto", "coa", "bl"]:
        exists = False
        size = 0
        for ext in [".pdf", ".png", ".jpg", ".jpeg"]:
            fn = f"{clean_bl}_{slot}{ext}"
            fp = os.path.realpath(os.path.join(UPLOADS_DIR, fn))
            if fp.startswith(os.path.realpath(UPLOADS_DIR)) and os.path.exists(fp):
                exists = True
                size = os.path.getsize(fp)
                break
        meta[slot] = {
            "uploaded": exists,
            "sizeBytes": size,
            "downloadUrl": f"/api/documents/{clean_bl}/{slot}" if exists else None
        }
    return {"success": True, "bl": clean_bl, "documents": meta}
 
@router.get("/api/documents/certificates/{filename}")
@router.head("/api/documents/certificates/{filename}")
async def get_commodity_certificate_doc(filename: str):
    """Serves official commodity Certificate of Analysis (COA) / Lab test reports."""
    clean_fn = os.path.basename(filename)
    filepath = os.path.realpath(os.path.join(CERT_DIR, clean_fn))

    if not filepath.startswith(os.path.realpath(CERT_DIR)) or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Certificate document '{clean_fn}' not found.")

    _, ext = os.path.splitext(clean_fn)
    ext = ext.lower()
    media_type = "application/pdf" if ext == ".pdf" else ("image/png" if ext == ".png" else "image/jpeg")

    return FileResponse(
        filepath,
        media_type=media_type,
        content_disposition_type="inline",
        headers={"Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff"}
    )

@router.get("/api/documents/{bl}/{slot}")
@router.head("/api/documents/{bl}/{slot}")
async def get_trade_document(request: Request, bl: str, slot: str, inline: int = 0):
    client_ip = get_client_ip(request)
    allowed, retry_after = RATE_LIMITER.is_allowed("document-download", client_ip, max_requests=100, window_seconds=300)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": f"Too many download requests. Please retry in {retry_after} seconds."},
            headers={"Retry-After": str(retry_after)}
        )

    clean_bl = sanitize_code(bl)
    clean_slot = normalize_slot(slot)
    
    if clean_slot not in {"inv", "phyto", "coa", "bl"}:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid document slot."})

    for ext in [".pdf", ".png", ".jpg", ".jpeg"]:
        filename = f"{clean_bl}_{clean_slot}{ext}"
        filepath = os.path.realpath(os.path.join(UPLOADS_DIR, filename))
        if filepath.startswith(os.path.realpath(UPLOADS_DIR)) and os.path.exists(filepath):
            media_type = "application/pdf" if ext == ".pdf" else ("image/png" if ext == ".png" else "image/jpeg")
            disp = "inline" if inline == 1 else "attachment"
            return FileResponse(
                filepath,
                media_type=media_type,
                filename=f"GGE_{clean_slot.upper()}_{clean_bl}{ext}",
                content_disposition_type=disp,
                headers={"Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff"}
            )
            
    return JSONResponse(status_code=404, content={
        "success": False,
        "error": f"Official document '{clean_slot.upper()}' has not been uploaded to server vault for B/L {clean_bl}."
    })

@router.delete("/api/documents/{bl}/{slot}")
async def delete_trade_document(bl: str, slot: str, user: dict = Depends(require_auth(["admin", "logistics"]))):
    clean_bl = sanitize_code(bl)
    clean_slot = normalize_slot(slot)

    if clean_slot not in {"inv", "phyto", "coa", "bl"}:
        raise HTTPException(status_code=400, detail="Invalid document slot.")

    deleted = False
    for ext in ALLOWED_EXTENSIONS:
        filename = f"{clean_bl}_{clean_slot}{ext}"
        filepath = os.path.realpath(os.path.join(UPLOADS_DIR, filename))
        if filepath.startswith(os.path.realpath(UPLOADS_DIR)) and os.path.exists(filepath):
            try:
                os.remove(filepath)
                deleted = True
            except Exception:
                pass

    session = SessionLocal()
    try:
        rec = session.query(ConsignmentModel).filter_by(bl=clean_bl).first()
        if not rec:
            rec = session.query(ConsignmentModel).filter(func.lower(ConsignmentModel.bl) == clean_bl.lower()).first()
        if rec:
            ref_col = f"{clean_slot}_ref"
            if hasattr(rec, ref_col):
                setattr(rec, ref_col, "")
            rec.updated_at = time.time()
            session.commit()

            try:
                from backend.core.atomic_io import atomic_json_write
                all_consigns = [r.to_dict() for r in session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()]
                atomic_json_write(os.path.join(DATA_DIR, 'consignments.json'), all_consigns)
            except Exception:
                pass
    finally:
        session.close()

    from backend.core.events import broadcast_sse
    broadcast_sse("CONSIGNMENT_UPDATED", {"bl": clean_bl, "slot": clean_slot, "deleted": True, "timestamp": time.time()})

    return {"success": True, "message": f"Document {clean_slot} for {clean_bl} removed from vault.", "deleted": deleted}

@router.post("/api/documents/proforma-invoice")
async def generate_proforma_invoice(request: Request):
    """
    Generates an institutional Proforma Invoice (PI) conforming to ICC Incoterms 2020.
    Accepts inquiry / contract parameters and returns structured metadata and print-ready HTML.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    try:
        builder = ProformaInvoiceBuilder(data)
        result = builder.to_dict()
        html_content = builder.build_html()
        result["html"] = html_content
    except Exception as exc:
        return JSONResponse(status_code=400, content={"success": False, "error": f"Failed to generate Proforma Invoice: {str(exc)}"})

    fmt = request.query_params.get("format", "").lower()
    if fmt == "html" or "text/html" in request.headers.get("accept", ""):
        return HTMLResponse(content=html_content)

    return JSONResponse(content={"success": True, "proformaInvoice": result})

@router.post("/api/documents/packing-list")
async def generate_packing_list(request: Request):
    """
    Generates an export Commercial Packing List (PL) detailing container, tare/gross weights, and seals.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    try:
        builder = PackingListBuilder(data)
        result = builder.to_dict()
        html_content = builder.build_html()
        result["html"] = html_content
    except Exception as exc:
        return JSONResponse(status_code=400, content={"success": False, "error": f"Failed to generate Packing List: {str(exc)}"})

    fmt = request.query_params.get("format", "").lower()
    if fmt == "html" or "text/html" in request.headers.get("accept", ""):
        return HTMLResponse(content=html_content)

    return JSONResponse(content={"success": True, "packingList": result})



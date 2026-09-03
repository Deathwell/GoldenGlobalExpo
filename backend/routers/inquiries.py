"""
Golden Global Expo — Inquiries & Lead Management Router
"""
import os
import time
import secrets
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from backend.core.config import BASE_DIR
from backend.core.atomic_io import atomic_json_write
from backend.core.events import broadcast_sse
from backend.db import SessionLocal, InquiryModel

router = APIRouter(tags=["Commercial Inquiries & RFQ"])

@router.get("/api/inquiries")
async def get_inquiries():
    session = SessionLocal()
    try:
        records = session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()
        return {'success': True, 'inquiries': [r.to_dict() for r in records]}
    finally:
        session.close()

@router.post("/api/inquiries")
async def save_inquiries(request: Request):
    try:
        data = await request.json()
        if not data or (isinstance(data, dict) and not any(data.values())):
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Inquiry payload cannot be empty.'})

        if isinstance(data, dict) and not data.get('name') and not data.get('email') and not data.get('phone') and not data.get('commodities'):
            return JSONResponse(status_code=400, content={'success': False, 'error': 'Inquiry requires contact information or commodity selection.'})

        session = SessionLocal()
        try:
            items_to_save = data if isinstance(data, list) else [data]
            for item in items_to_save:
                iid = item.get('id') or f"RFQ-{secrets.token_hex(4).upper()}"
                record = session.query(InquiryModel).filter_by(id=iid).first()
                if record:
                    for field in ['name', 'company', 'email', 'phone', 'country', 'address', 'commodities', 'volume', 'incoterms', 'payable', 'status', 'date']:
                        if field in item and item[field]:
                            setattr(record, field, item[field])
                    if 'blCode' in item and item['blCode']:
                        record.bl_code = item['blCode']
                    if 'createdAt' in item and item['createdAt']:
                        try: record.created_at = float(item['createdAt'])
                        except Exception: pass
                    elif 'created_at' in item and item['created_at']:
                        try: record.created_at = float(item['created_at'])
                        except Exception: pass
                else:
                    c_time = float(item.get('createdAt') or item.get('created_at') or time.time())
                    session.add(InquiryModel(
                        id=iid,
                        type=item.get('type', 'BULK_INQUIRY'),
                        name=item.get('name', ''),
                        company=item.get('company', ''),
                        email=item.get('email', ''),
                        phone=item.get('phone', ''),
                        country=item.get('country', ''),
                        address=item.get('address', ''),
                        commodities=item.get('commodities', item.get('lotName', '')),
                        volume=item.get('volume', ''),
                        incoterms=item.get('incoterms', 'CIF'),
                        payable=item.get('payable', ''),
                        status=item.get('status', 'New RFQ'),
                        bl_code=item.get('blCode', ''),
                        date=item.get('date', time.strftime('%Y-%m-%d')),
                        created_at=c_time
                    ))
            session.commit()

            all_inqs = [r.to_dict() for r in session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()]
            try:
                atomic_json_write(os.path.join(str(BASE_DIR), 'data', 'inquiries.json'), all_inqs)
            except Exception: pass

            broadcast_sse("NEW_INQUIRY", {"total": len(all_inqs), "timestamp": time.time()})
            return {'success': True, 'message': 'Inquiries updated in ACID database.', 'total': len(all_inqs)}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

@router.delete("/api/inquiries/{inquiry_id}")
async def delete_inquiry(inquiry_id: str):
    session = SessionLocal()
    try:
        session.query(InquiryModel).filter_by(id=inquiry_id).delete()
        session.commit()
        all_inqs = [r.to_dict() for r in session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()]
        try:
            atomic_json_write(os.path.join(str(BASE_DIR), 'data', 'inquiries.json'), all_inqs)
        except Exception: pass
        broadcast_sse("NEW_INQUIRY", {"total": len(all_inqs), "timestamp": time.time()})
        return {'success': True, 'message': f'Inquiry {inquiry_id} deleted.'}
    finally:
        session.close()

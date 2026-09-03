"""
Golden Global Expo — Consignments & Tracking Router
"""
import os
import time
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from backend.core.config import BASE_DIR
from backend.core.atomic_io import atomic_json_write
from backend.core.events import broadcast_sse
from backend.db import SessionLocal, ConsignmentModel

router = APIRouter(tags=["Consignments & Maritime Tracking"])

@router.get("/api/consignments")
async def get_consignments():
    session = SessionLocal()
    try:
        records = session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()
        return {'success': True, 'consignments': [r.to_dict() for r in records]}
    finally:
        session.close()

@router.get("/api/track")
async def track_consignment(bl: str = ""):
    """Track a shipment by B/L code with sanitized query handling."""
    if not bl or not bl.strip():
        return JSONResponse(status_code=400, content={'success': False, 'error': 'Missing B/L tracking number.'})
    session = SessionLocal()
    try:
        clean_bl = bl.strip()
        record = session.query(ConsignmentModel).filter(ConsignmentModel.bl.ilike(clean_bl)).first()
        if record:
            return {'success': True, 'consignment': record.to_dict()}
        return JSONResponse(status_code=404, content={'success': False, 'error': f'Consignment with B/L {clean_bl} not found.'})
    finally:
        session.close()

@router.post("/api/consignments")
async def save_consignments(request: Request):
    try:
        data = await request.json()
        session = SessionLocal()
        try:
            items_to_save = data if isinstance(data, list) else [data]
            for item in items_to_save:
                bl_val = item.get('bl') or item.get('blCode', '')
                if not bl_val: continue
                record = session.query(ConsignmentModel).filter_by(bl=bl_val).first()
                if record:
                    for field in ['inquiryRef', 'quotationRef', 'buyer', 'buyerEmail', 'buyerPhone', 'commodity', 'vessel', 'pod', 'eta', 'container', 'status', 'invRef', 'phytoRef', 'coaRef', 'blRef']:
                        col = {
                            'inquiryRef': 'inquiry_ref',
                            'quotationRef': 'quotation_ref',
                            'buyerEmail': 'buyer_email',
                            'buyerPhone': 'buyer_phone',
                            'invRef': 'inv_ref',
                            'phytoRef': 'phyto_ref',
                            'coaRef': 'coa_ref',
                            'blRef': 'bl_ref'
                        }.get(field, field)
                        if field in item and item[field] is not None:
                            setattr(record, col, item[field])
                    if 'stage' in item and item['stage'] is not None:
                        record.stage = int(item['stage'])
                    record.updated_at = time.time()
                else:
                    session.add(ConsignmentModel(
                        bl=bl_val,
                        inquiry_ref=item.get('inquiryRef', ''),
                        quotation_ref=item.get('quotationRef', ''),
                        buyer=item.get('buyer', ''),
                        buyer_email=item.get('buyerEmail', ''),
                        buyer_phone=item.get('buyerPhone', ''),
                        commodity=item.get('commodity', ''),
                        vessel=item.get('vessel', 'Pending Ocean Booking'),
                        pod=item.get('pod', ''),
                        eta=item.get('eta', 'Pending Ocean Schedule'),
                        container=item.get('container', 'PENDING ALLOCATION'),
                        stage=int(item.get('stage', 1)),
                        status=item.get('status', 'Stage 1: Mandi Sourced & Grading'),
                        inv_ref=item.get('invRef', ''),
                        phyto_ref=item.get('phytoRef', ''),
                        coa_ref=item.get('coaRef', ''),
                        bl_ref=item.get('blRef', '')
                    ))
            session.commit()

            all_consigns = [r.to_dict() for r in session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()]
            try:
                atomic_json_write(os.path.join(str(BASE_DIR), 'data', 'consignments.json'), all_consigns)
            except Exception: pass

            broadcast_sse("CONSIGNMENT_UPDATED", {"total": len(all_consigns), "timestamp": time.time()})
            return {'success': True, 'message': 'Consignments updated in ACID database.', 'total': len(all_consigns)}
        finally:
            session.close()
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})

@router.delete("/api/consignments/{bl_code}")
async def delete_consignment(bl_code: str):
    session = SessionLocal()
    try:
        session.query(ConsignmentModel).filter_by(bl=bl_code).delete()
        session.commit()
        all_consigns = [r.to_dict() for r in session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()]
        try:
            atomic_json_write(os.path.join(str(BASE_DIR), 'data', 'consignments.json'), all_consigns)
        except Exception: pass
        return {'success': True, 'message': f'Consignment {bl_code} deleted.'}
    except Exception as e:
        return JSONResponse(status_code=500, content={'success': False, 'error': str(e)})
    finally:
        session.close()

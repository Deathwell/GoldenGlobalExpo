"""
Golden Global Expo — Commodity Catalog & Quality Assays Router
Full CRUD and assay specification management for export and domestic commodity lots.
"""
import os
import json
import time
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from backend.core.auth_dependency import require_auth
from backend.core.config import BASE_DIR
from backend.db import SessionLocal, CommoditySpecificationModel, CommodityPriceModel, DATA_DIR
from backend.core.events import broadcast_sse

router = APIRouter(tags=["Commodity Catalog & Assays"])

DEFAULT_CATALOG = [
    {
        "code": "p1",
        "name": "Classic Toor (Tur Dal / Split Pigeon Pea)",
        "botanical": "Cajanus cajan",
        "category": "Pulses",
        "image": "images/products/toor_dal.jpg?v=6",
        "hs_code": "0713.60.00",
        "origin": "Maharashtra / Karnataka (India)",
        "crop": "2025/2026 Crop (Peak Mandi: Dec–Feb)",
        "harvest_season": "December to February",
        "purity": "99.5% Min (Sortex Clean Grade-A)",
        "moisture": "10.0% – 12.0% Max",
        "foreign_matter": "0.1% Max",
        "protein": "22.3% – 24.5%",
        "packing": "25kg / 50kg PP Woven Bags",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "24 Months",
        "certifications": "APEDA Compliance, FSSAI Export Standards, Phytosanitary, Non-GMO",
        "base_usd": 820.0,
        "domestic_packs": {"500g": 90, "1kg": 160, "5kg": 780, "25kg": 3750}
    },
    {
        "code": "p2",
        "name": "Classic Moong (Whole Green Mung Bean)",
        "botanical": "Vigna radiata",
        "category": "Pulses",
        "image": "images/products/moong_whole.jpg?v=5",
        "hs_code": "0713.31.00",
        "origin": "Maharashtra / Karnataka (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "October–November & April–May",
        "purity": "99.5% Min (Machine Clean & Polished)",
        "moisture": "11.0% Max",
        "foreign_matter": "0.2% Max",
        "protein": "24.0% – 25.5%",
        "packing": "25kg / 50kg PP Bags",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "24 Months",
        "certifications": "APEDA Compliance, FSSAI Export Standards, Phytosanitary, Non-GMO",
        "base_usd": 840.0,
        "domestic_packs": {"500g": 85, "1kg": 150, "5kg": 720, "25kg": 3450}
    },
    {
        "code": "p3",
        "name": "Classic Chana Dal (Bengal Gram Split)",
        "botanical": "Cicer arietinum",
        "category": "Pulses",
        "image": "images/products/chana_dal.jpg?v=6",
        "hs_code": "0713.20.00",
        "origin": "Maharashtra / Karnataka (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "February to April",
        "purity": "99.7% Min (Sortex Clean)",
        "moisture": "10.5% Max",
        "foreign_matter": "0.05% Max",
        "protein": "20.8% – 22.0%",
        "packing": "25kg / 50kg PP Woven Bags with Liner",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "24 Months",
        "certifications": "APEDA Compliance, FSSAI Export Standards, SGS Ready",
        "base_usd": 760.0,
        "domestic_packs": {"500g": 70, "1kg": 125, "5kg": 590, "25kg": 2800}
    },
    {
        "code": "p4",
        "name": "Classic Masoor (Split Red Lentils)",
        "botanical": "Lens culinaris",
        "category": "Pulses",
        "image": "images/products/masoor_split.jpg?v=6",
        "hs_code": "0713.40.00",
        "origin": "Maharashtra / Karnataka (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "February to April",
        "purity": "99.5% Min (Sortex Clean Grade-A)",
        "moisture": "11.0% Max",
        "foreign_matter": "0.1% Max",
        "protein": "25.0% – 26.5%",
        "packing": "25kg / 50kg PP Woven Bags",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "24 Months",
        "certifications": "APEDA Compliance, FSSAI Export Standards, Phytosanitary, Non-GMO",
        "base_usd": 790.0,
        "domestic_packs": {"500g": 75, "1kg": 135, "5kg": 640, "25kg": 3050}
    },
    {
        "code": "p5",
        "name": "Chia Seeds (Raw Superfood 99.9% Purity)",
        "botanical": "Salvia hispanica L.",
        "category": "Seeds",
        "image": "images/products/chia_seeds.jpg?v=6",
        "hs_code": "1207.99.90",
        "origin": "Maharashtra / Karnataka (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "February to April",
        "purity": "99.9% Min (Sortex Triple Clean)",
        "moisture": "7.0% Max",
        "foreign_matter": "0.0% Nil",
        "protein": "18.5% – 21.0% (Omega-3 60%)",
        "packing": "25kg Paper Bags / 1kg Vacuum Bags",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "36 Months",
        "certifications": "FSSAI Standards, APEDA Compliance, ETO-Free, Gluten-Free",
        "base_usd": 1850.0,
        "domestic_packs": {"500g": 190, "1kg": 350, "5kg": 1680, "25kg": 8000}
    },
    {
        "code": "p6",
        "name": "Coriander Seeds (Dhania Whole)",
        "botanical": "Coriandrum sativum",
        "category": "Spices",
        "image": "images/products/coriander_seeds.jpg?v=5",
        "hs_code": "0909.20.10",
        "origin": "Maharashtra / Rajasthan (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "February to April",
        "purity": "99.0% Min (Eagle Quality)",
        "moisture": "9.0% Max",
        "foreign_matter": "0.2% Max",
        "protein": "Volatile Oil 0.3%–0.5%",
        "packing": "25kg Jute Bags / PP Bags",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "24 Months",
        "certifications": "Spices Board India, FSSAI Standards, Phytosanitary",
        "base_usd": 1420.0,
        "domestic_packs": {"500g": 110, "1kg": 200, "5kg": 950, "25kg": 4500}
    },
    {
        "code": "p7",
        "name": "Cumin Seeds (Jeera Whole Sortex Clean)",
        "botanical": "Cuminum cyminum",
        "category": "Spices",
        "image": "images/products/cumin_seeds.jpg?v=5",
        "hs_code": "0910.99.12",
        "origin": "Gujarat / Rajasthan (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "February to April",
        "purity": "99.5% Min (Singapore/Europe Quality)",
        "moisture": "8.5% Max",
        "foreign_matter": "0.1% Max",
        "protein": "Volatile Oil 2.5%–3.5%",
        "packing": "25kg / 50kg Multi-Wall Bags",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "24 Months",
        "certifications": "Spices Board of India, FSSAI Export Standard, ETO Tested",
        "base_usd": 3800.0,
        "domestic_packs": {"500g": 280, "1kg": 520, "5kg": 2480, "25kg": 11800}
    },
    {
        "code": "p8",
        "name": "Moringa Leaf Powder (Organic Shade-Dried)",
        "botanical": "Moringa oleifera",
        "category": "Powders",
        "image": "images/products/moringa_powder.jpg?v=5",
        "hs_code": "1211.90.29",
        "origin": "Tamil Nadu / Maharashtra (India)",
        "crop": "2025/2026 Fresh Harvest",
        "harvest_season": "Year-Round",
        "purity": "100% Pure Organic Leaf",
        "moisture": "6.0% Max",
        "foreign_matter": "Nil / 0.0%",
        "protein": "27.0% – 30.0%",
        "packing": "20kg Fiber Drums with Double Liner",
        "loadability": "20' FCL Load: 12.0 MT",
        "shelf_life": "24 Months",
        "certifications": "Organic NPOP, FSSAI Standards, Heavy Metal Tested",
        "base_usd": 3800.0,
        "domestic_packs": {"500g": 220, "1kg": 400, "5kg": 1900, "25kg": 9000}
    },
    {
        "code": "p9",
        "name": "Mint Powder (Pudina Sun-Dried)",
        "botanical": "Mentha spicata",
        "category": "Powders",
        "image": "images/products/mint_powder.jpg?v=5",
        "hs_code": "1211.90.99",
        "origin": "Uttar Pradesh / Maharashtra (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "May to July",
        "purity": "100% Pure Dehydrated Leaf",
        "moisture": "7.0% Max",
        "foreign_matter": "0.1% Max",
        "protein": "Menthol Oil Rich",
        "packing": "20kg Fiber Drums with Foil Liner",
        "loadability": "20' FCL Load: 12.0 MT",
        "shelf_life": "24 Months",
        "certifications": "FSSAI Export Standards, Micro-Organism Screened",
        "base_usd": 3200.0,
        "domestic_packs": {"500g": 180, "1kg": 330, "5kg": 1550, "25kg": 7400}
    },
    {
        "code": "p10",
        "name": "Coriander Powder (Agmark Export Quality)",
        "botanical": "Coriandrum sativum L.",
        "category": "Powders",
        "image": "images/products/coriander_powder.jpg?v=5",
        "hs_code": "0909.20.90",
        "origin": "Maharashtra / Rajasthan (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "March to May",
        "purity": "100% Pure Coriander (No fillers)",
        "moisture": "8.0% Max",
        "foreign_matter": "Nil",
        "protein": "Ash < 6.0%",
        "packing": "25kg Multi-Wall Bags",
        "loadability": "20' FCL Load: 20.0 MT",
        "shelf_life": "18 Months",
        "certifications": "Agmark Special Grade, Spices Board, FSSAI",
        "base_usd": 1650.0,
        "domestic_packs": {"500g": 120, "1kg": 220, "5kg": 1050, "25kg": 5000}
    },
    {
        "code": "p11",
        "name": "Jowar (Whole Sorghum Grains)",
        "botanical": "Sorghum bicolor",
        "category": "Grains",
        "image": "images/products/jowar_sorghum.jpg?v=6",
        "hs_code": "1007.90.00",
        "origin": "Maharashtra / Karnataka (India)",
        "crop": "2025/2026 Rabi Harvest",
        "harvest_season": "February to April",
        "purity": "99.0% Min (Sortex Clean)",
        "moisture": "11.0% Max",
        "foreign_matter": "0.2% Max",
        "protein": "10.4% – 11.8%",
        "packing": "50kg PP Woven Bags",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "24 Months",
        "certifications": "APEDA Compliance, FSSAI Export Standards, Non-GMO",
        "base_usd": 520.0,
        "domestic_packs": {"500g": 40, "1kg": 75, "5kg": 350, "25kg": 1650}
    },
    {
        "code": "p12",
        "name": "Jowar Flour (Sorghum Flour)",
        "botanical": "Sorghum bicolor flour",
        "category": "Grains",
        "image": "images/products/jowar_flour.jpg?v=6",
        "hs_code": "1102.90.00",
        "origin": "Maharashtra (India)",
        "crop": "Fresh Mill Run",
        "harvest_season": "Year-Round",
        "purity": "100% Pure Gluten-Free Flour",
        "moisture": "10.0% Max",
        "foreign_matter": "Nil",
        "protein": "10.0% – 11.2%",
        "packing": "25kg / 50kg Multi-Wall Paper Bags",
        "loadability": "20' FCL Load: 20.0 MT",
        "shelf_life": "12 Months",
        "certifications": "Gluten-Free Certified, FSSAI Export Standards",
        "base_usd": 620.0,
        "domestic_packs": {"500g": 45, "1kg": 85, "5kg": 400, "25kg": 1900}
    },
    {
        "code": "p13",
        "name": "Tissue Paper Virgin Pulp",
        "botanical": "Cellulose / Wood Pulp",
        "category": "Paper",
        "image": "images/products/tissue_paper.jpg?v=5",
        "hs_code": "4818.10.00",
        "origin": "Gujarat / Maharashtra (India)",
        "crop": "Continuous Mill Run",
        "harvest_season": "Year-Round",
        "purity": "100% Virgin Bamboo/Wood Pulp",
        "moisture": "5.0% Max",
        "foreign_matter": "Nil",
        "protein": "N/A",
        "packing": "Carton Packing with Shrink Wrap",
        "loadability": "40' HC Container Load: 18.0 MT",
        "shelf_life": "36 Months",
        "certifications": "ISO 9001:2015, FSC Certified Pulp, Non-Toxic",
        "base_usd": 1150.0,
        "domestic_packs": {"500g": 150, "1kg": 280, "5kg": 1300, "25kg": 5800}
    },
    {
        "code": "p14",
        "name": "Emmer Wheat (Khapli Wheat)",
        "botanical": "Triticum dicoccum",
        "category": "Grains",
        "image": "images/products/emmer_wheat.jpg?v=5",
        "hs_code": "1001.99.10",
        "origin": "Maharashtra / Karnataka (India)",
        "crop": "2025/2026 Rabi Crop",
        "harvest_season": "February to April",
        "purity": "99.5% Min (Low-Gluten Ancient Grain)",
        "moisture": "11.0% Max",
        "foreign_matter": "0.1% Max",
        "protein": "14.5% – 16.0%",
        "packing": "25kg / 50kg Bags",
        "loadability": "20' FCL Load: 24.0 MT",
        "shelf_life": "24 Months",
        "certifications": "APEDA Compliance, FSSAI Certified, Non-GMO",
        "base_usd": 680.0,
        "domestic_packs": {"500g": 55, "1kg": 100, "5kg": 480, "25kg": 2300}
    },
    {
        "code": "p15",
        "name": "Pure Cow Ghee (Desi Bilona)",
        "botanical": "Clarified Butterfat",
        "category": "Dairy",
        "image": "images/products/cow_ghee.jpg?v=5",
        "hs_code": "0405.90.20",
        "origin": "Maharashtra (India)",
        "crop": "Fresh Farm Production",
        "harvest_season": "Year-Round",
        "purity": "99.8% Pure Milk Fat (Bilona Churned)",
        "moisture": "0.3% Max",
        "foreign_matter": "Nil",
        "protein": "Nil (Lactose/Casein Free)",
        "packing": "Food Grade Tin / Glass Jars / 15kg Tins",
        "loadability": "20' FCL Load: 15.0 MT",
        "shelf_life": "18 Months",
        "certifications": "Agmark Special Grade, FSSAI Central Export Standard",
        "base_usd": 6800.0,
        "domestic_packs": {"500g": 450, "1kg": 850, "5kg": 4100, "25kg": 19800}
    },
    {
        "code": "p17",
        "name": "Indian Home Spices (Individual Lots)",
        "botanical": "Assorted Spices",
        "category": "Spices",
        "image": "images/products/home_spices.jpg?v=5",
        "hs_code": "0910.91.00",
        "origin": "Maharashtra / Kerala (India)",
        "crop": "2025/2026 Crop",
        "harvest_season": "Seasonal",
        "purity": "Sortex Clean Single Lot",
        "moisture": "9.0% Max",
        "foreign_matter": "0.1% Max",
        "protein": "Essential Oils Retained",
        "packing": "25kg PP Bags / Custom Retail Cartons",
        "loadability": "20' FCL Load: 20.0 MT",
        "shelf_life": "24 Months",
        "certifications": "Spices Board of India, FSSAI Certified",
        "base_usd": 2450.0,
        "domestic_packs": {"500g": 160, "1kg": 300, "5kg": 1420, "25kg": 6800}
    }
]

def _seed_catalog_if_empty(session):
    count = session.query(CommoditySpecificationModel).count()
    if count == 0:
        for itm in DEFAULT_CATALOG:
            session.add(CommoditySpecificationModel(
                code=itm["code"],
                name=itm["name"],
                botanical=itm.get("botanical", ""),
                category=itm.get("category", "Pulses"),
                image=itm.get("image", ""),
                hs_code=itm.get("hs_code", ""),
                origin=itm.get("origin", "Maharashtra / Karnataka (India)"),
                crop=itm.get("crop", "2025/2026 Crop"),
                harvest_season=itm.get("harvest_season", ""),
                purity=itm.get("purity", "99.5% Min"),
                moisture=itm.get("moisture", "11.0% Max"),
                foreign_matter=itm.get("foreign_matter", "0.1% Max"),
                protein=itm.get("protein", ""),
                packing=itm.get("packing", "25kg / 50kg PP Woven Bags"),
                loadability=itm.get("loadability", "20' FCL Load: 24.0 MT"),
                shelf_life=itm.get("shelf_life", "24 Months"),
                certifications=itm.get("certifications", "APEDA, FSSAI"),
                base_usd=itm.get("base_usd", 850.0),
                domestic_packs_json=json.dumps(itm.get("domestic_packs", {})),
                coa_url="",
                is_active=1,
                updated_at=time.time()
            ))
        session.commit()

@router.get("/api/commodities")
async def list_commodities(
    segment: Optional[str] = "all",
    active_only: bool = True
):
    session = SessionLocal()
    try:
        _seed_catalog_if_empty(session)
        q = session.query(CommoditySpecificationModel)
        if active_only:
            q = q.filter(CommoditySpecificationModel.is_active == 1)
        records = q.order_by(CommoditySpecificationModel.code.asc()).all()
        commodities = [r.to_dict() for r in records]

        # Sync spot price from CommodityPriceModel if available
        prices = {p.code: (p.base_usd if p.base_usd and p.base_usd > 0 else p.price_inr) for p in session.query(CommodityPriceModel).all()}
        for c in commodities:
            if c["code"] in prices and prices[c["code"]] is not None and prices[c["code"]] > 0:
                c["baseUsd"] = prices[c["code"]]
                c["price"] = prices[c["code"]]

        return {"success": True, "count": len(commodities), "commodities": commodities}
    finally:
        session.close()

@router.get("/api/commodities/{code}")
async def get_commodity(code: str):
    session = SessionLocal()
    try:
        _seed_catalog_if_empty(session)
        rec = session.query(CommoditySpecificationModel).filter_by(code=code.strip()).first()
        if not rec:
            raise HTTPException(status_code=404, detail=f"Commodity '{code}' not found in catalog.")
        data = rec.to_dict()
        price_rec = session.query(CommodityPriceModel).filter_by(code=code.strip()).first()
        if price_rec and price_rec.base_usd:
            data["baseUsd"] = price_rec.base_usd
            data["price"] = price_rec.base_usd
        return {"success": True, "commodity": data}
    finally:
        session.close()

@router.post("/api/commodities")
async def create_commodity(
    request: Request,
    user: dict = Depends(require_auth(["admin"]))
):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    code = str(payload.get("code") or "").strip().lower()
    name = str(payload.get("name") or "").strip()
    if not code or not name:
        raise HTTPException(status_code=400, detail="Commodity code and name are required.")

    session = SessionLocal()
    try:
        existing = session.query(CommoditySpecificationModel).filter_by(code=code).first()
        if existing and existing.is_active:
            raise HTTPException(status_code=409, detail=f"Commodity code '{code}' already exists.")

        base_usd = float(payload.get("baseUsd") or payload.get("price") or 850.0)
        dom_packs = payload.get("domesticPacks") or payload.get("packs") or {}

        if existing:
            # Reactivate soft-deleted commodity with updated specs
            item = existing
            item.name = name
            item.botanical = str(payload.get("botanical") or "")
            item.category = str(payload.get("category") or "Pulses")
            item.image = str(payload.get("image") or "images/products/toor_dal.jpg")
            item.hs_code = str(payload.get("hsCode") or payload.get("hs") or "0713.90.00")
            item.origin = str(payload.get("origin") or "Maharashtra / Karnataka (India)")
            item.crop = str(payload.get("crop") or "2025/2026 Crop")
            item.harvest_season = str(payload.get("harvestSeason") or "")
            item.purity = str(payload.get("purity") or "99.5% Min")
            item.moisture = str(payload.get("moisture") or "11.0% Max")
            item.foreign_matter = str(payload.get("foreignMatter") or "0.1% Max")
            item.protein = str(payload.get("protein") or "")
            item.packing = str(payload.get("packing") or "25kg / 50kg PP Woven Bags")
            item.loadability = str(payload.get("loadability") or "20' FCL Load: 24.0 MT")
            item.shelf_life = str(payload.get("shelfLife") or "24 Months")
            item.certifications = str(payload.get("certifications") or "APEDA, FSSAI")
            item.base_usd = base_usd
            item.domestic_packs_json = json.dumps(dom_packs)
            item.coa_url = str(payload.get("coaUrl") or "")
            item.is_active = 1 if payload.get("isActive", True) else 0
            item.updated_at = time.time()
        else:
            item = CommoditySpecificationModel(
                code=code,
                name=name,
                botanical=str(payload.get("botanical") or ""),
                category=str(payload.get("category") or "Pulses"),
                image=str(payload.get("image") or "images/products/toor_dal.jpg"),
                hs_code=str(payload.get("hsCode") or payload.get("hs") or "0713.90.00"),
                origin=str(payload.get("origin") or "Maharashtra / Karnataka (India)"),
                crop=str(payload.get("crop") or "2025/2026 Crop"),
                harvest_season=str(payload.get("harvestSeason") or ""),
                purity=str(payload.get("purity") or "99.5% Min"),
                moisture=str(payload.get("moisture") or "11.0% Max"),
                foreign_matter=str(payload.get("foreignMatter") or "0.1% Max"),
                protein=str(payload.get("protein") or ""),
                packing=str(payload.get("packing") or "25kg / 50kg PP Woven Bags"),
                loadability=str(payload.get("loadability") or "20' FCL Load: 24.0 MT"),
                shelf_life=str(payload.get("shelfLife") or "24 Months"),
                certifications=str(payload.get("certifications") or "APEDA, FSSAI"),
                base_usd=base_usd,
                domestic_packs_json=json.dumps(dom_packs),
                coa_url=str(payload.get("coaUrl") or ""),
                is_active=1 if payload.get("isActive", True) else 0,
                updated_at=time.time()
            )
            session.add(item)

        # Also register in CommodityPriceModel so pricing router sees it
        price_rec = session.query(CommodityPriceModel).filter_by(code=code).first()
        if not price_rec:
            session.add(CommodityPriceModel(
                code=code,
                name=name,
                category=item.category,
                base_usd=base_usd,
                price_inr=base_usd,
                margin_pct=0.0
            ))
        else:
            price_rec.base_usd = base_usd
            price_rec.name = name

        session.commit()
        broadcast_sse("COMMODITY_CATALOG_UPDATED", {"code": code, "action": "created", "name": name})
        return {"success": True, "message": f"Commodity '{name}' registered successfully.", "commodity": item.to_dict()}
    finally:
        session.close()

@router.put("/api/commodities/{code}")
async def update_commodity(
    code: str,
    request: Request,
    user: dict = Depends(require_auth(["admin"]))
):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    session = SessionLocal()
    try:
        rec = session.query(CommoditySpecificationModel).filter_by(code=code.strip()).first()
        if not rec:
            raise HTTPException(status_code=404, detail=f"Commodity '{code}' not found.")

        if "name" in payload: rec.name = str(payload["name"]).strip()
        if "botanical" in payload: rec.botanical = str(payload["botanical"]).strip()
        if "category" in payload: rec.category = str(payload["category"]).strip()
        if "image" in payload: rec.image = str(payload["image"]).strip()
        if "hsCode" in payload: rec.hs_code = str(payload["hsCode"]).strip()
        if "hs" in payload: rec.hs_code = str(payload["hs"]).strip()
        if "origin" in payload: rec.origin = str(payload["origin"]).strip()
        if "crop" in payload: rec.crop = str(payload["crop"]).strip()
        if "harvestSeason" in payload: rec.harvest_season = str(payload["harvestSeason"]).strip()
        if "purity" in payload: rec.purity = str(payload["purity"]).strip()
        if "moisture" in payload: rec.moisture = str(payload["moisture"]).strip()
        if "foreignMatter" in payload: rec.foreign_matter = str(payload["foreignMatter"]).strip()
        if "protein" in payload: rec.protein = str(payload["protein"]).strip()
        if "packing" in payload: rec.packing = str(payload["packing"]).strip()
        if "loadability" in payload: rec.loadability = str(payload["loadability"]).strip()
        if "shelfLife" in payload: rec.shelf_life = str(payload["shelfLife"]).strip()
        if "certifications" in payload: rec.certifications = str(payload["certifications"]).strip()
        if "baseUsd" in payload or "price" in payload:
            new_p = float(payload.get("baseUsd") or payload.get("price"))
            rec.base_usd = new_p
            price_rec = session.query(CommodityPriceModel).filter_by(code=code.strip()).first()
            if price_rec:
                price_rec.base_usd = new_p
        if "domesticPacks" in payload or "packs" in payload:
            rec.domestic_packs_json = json.dumps(payload.get("domesticPacks") or payload.get("packs") or {})
        if "coaUrl" in payload: rec.coa_url = str(payload["coaUrl"]).strip()
        if "isActive" in payload: rec.is_active = 1 if payload["isActive"] else 0
        rec.updated_at = time.time()

        session.commit()
        broadcast_sse("COMMODITY_CATALOG_UPDATED", {"code": code, "action": "updated"})
        return {"success": True, "message": f"Commodity '{rec.name}' specifications updated.", "commodity": rec.to_dict()}
    finally:
        session.close()

@router.delete("/api/commodities/{code}")
async def delete_commodity(
    code: str,
    user: dict = Depends(require_auth(["admin"]))
):
    session = SessionLocal()
    try:
        rec = session.query(CommoditySpecificationModel).filter_by(code=code.strip()).first()
        if not rec:
            raise HTTPException(status_code=404, detail=f"Commodity '{code}' not found.")
        rec.is_active = 0
        rec.updated_at = time.time()
        session.commit()
        broadcast_sse("COMMODITY_CATALOG_UPDATED", {"code": code, "action": "deactivated"})
        return {"success": True, "message": f"Commodity '{rec.name}' ({code}) has been deactivated."}
    finally:
        session.close()

@router.post("/api/commodities/{code}/certificate")
async def upload_commodity_certificate(
    code: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_auth(["admin", "logistics"]))
):
    """Uploads lab assay / Certificate of Analysis (COA) for a commodity."""
    clean_code = code.strip().lower()
    session = SessionLocal()
    try:
        rec = session.query(CommoditySpecificationModel).filter_by(code=clean_code).first()
        if not rec:
            raise HTTPException(status_code=404, detail=f"Commodity '{code}' not found.")

        filename = file.filename or "assay_certificate.pdf"
        _, ext = os.path.splitext(filename)
        ext = ext.lower()
        if ext not in {".pdf", ".png", ".jpg", ".jpeg"}:
            raise HTTPException(status_code=400, detail="Certificate must be PDF, PNG, or JPG.")

        content = await file.read()
        if len(content) > 15 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File exceeds 15MB limit.")

        if len(content) < 16:
            raise HTTPException(status_code=400, detail="Invalid certificate: File payload is empty or corrupted.")

        # Signature verification to prevent polyglot and spoofed file uploads
        if ext == ".pdf" and not content.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="Invalid PDF certificate: Missing %PDF- header signature.")
        elif ext == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(status_code=400, detail="Invalid PNG certificate: Missing PNG header signature.")
        elif ext in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8\xff"):
            raise HTTPException(status_code=400, detail="Invalid JPEG certificate: Missing JPEG header signature.")

        cert_dir = os.path.join(str(BASE_DIR), "uploads", "certificates")
        os.makedirs(cert_dir, exist_ok=True)
        dest_filename = f"COA_{clean_code.upper()}{ext}"
        dest_path = os.path.join(cert_dir, dest_filename)

        with open(dest_path, "wb") as f:
            f.write(content)

        rec.coa_url = f"/api/documents/certificates/{dest_filename}"
        rec.updated_at = time.time()
        session.commit()

        broadcast_sse("COMMODITY_CATALOG_UPDATED", {"code": clean_code, "action": "certificate_uploaded"})
        return {
            "success": True,
            "message": f"Certificate of Analysis attached to {rec.name}.",
            "coaUrl": rec.coa_url
        }
    finally:
        session.close()

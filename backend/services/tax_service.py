"""
Golden Global Expo — Tax Calculation Service
Statutory Indian GST calculation engine adhering to GST Council rules for packaged food commodities.
Encapsulates intra-state (CGST + SGST) vs inter-state (IGST) logic, HSN classifications,
and inclusive tax decomposition.
"""
from dataclasses import dataclass
from typing import Dict, Any, Optional

MAHARASHTRA_STATE_VARIANTS = {
    "maharashtra", "mh", "mumbai", "navi mumbai", "pune", "nagpur", "nashik", "thane", "27"
}

import re

# Statutory HSN mapping for domestic agricultural commodities
COMMODITY_HSN_MAP = {
    # Pulses / Legumes (Chapter 07)
    "toor": "0713",
    "tur": "0713",
    "arhar": "0713",
    "moong": "0713",
    "mung": "0713",
    "chana": "0713",
    "chickpea": "0713",
    "masoor": "0713",
    "lentil": "0713",
    # Oil seeds (Chapter 12)
    "chia": "1207",
    "sesame": "1207",
    "til": "1207",
    "till": "1207",
    "mustard": "1207",
    "rai": "1207",
    "sarson": "1207",
    "groundnut": "1202",
    "peanut": "1202",
    "soybean": "1201",
    "sunflower": "1206",
    # Spices (Chapter 09)
    "coriander seed": "0909",
    "dhania whole": "0909",
    "dhania seed": "0909",
    "dhania": "0909",
    "cumin": "0909",
    "jeera": "0909",
    "moringa": "0910",
    "mint": "0910",
    "pudina": "0910",
    "coriander powder": "0910",
    "dhania powder": "0910",
    "turmeric": "0910",
    "haldi": "0910",
    "ginger": "0910",
    "adrak": "0910",
    "chilli": "0904",
    "chili": "0904",
    "pepper": "0904",
    "black pepper": "0904",
    "cardamom": "0908",
    "elaichi": "0908",
    "spices": "0910",
    "garam masala": "0910",
    "tea": "0902",
    "coffee": "0901",
    # Cereals & Grains (Chapter 10)
    "jowar": "1008",
    "sorghum": "1008",
    "rice": "1006",
    "basmati": "1006",
    "emmer": "1001",
    "khapli": "1001",
    "wheat": "1001",
    # Milling products (Chapter 11)
    "jowar flour": "1102",
    "sorghum flour": "1102",
    "atta": "1101",
    "flour": "1101",
    # Dairy (Chapter 04)
    "ghee": "0405",
    "bilona": "0405",
    # Paper / Pulp (Chapter 48)
    "tissue": "4818",
    "paper": "4818",
    # Sugar (Chapter 17)
    "sugar": "1701",
    # Cotton (Chapter 52)
    "cotton": "5201",
}

@dataclass
class TaxComputationResult:
    total_amount: float
    taxable_value: float
    total_tax: float
    is_intra_state: bool
    is_interstate: bool
    cgst_rate: float
    cgst_amount: float
    sgst_rate: float
    sgst_amount: float
    igst_rate: float
    igst_amount: float
    rate_per_unit: float
    hsn_code: str
    currency: str = "INR"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "isInterstate": self.is_interstate,
            "taxableValue": self.taxable_value,
            "cgstRate": self.cgst_rate,
            "cgstAmount": self.cgst_amount,
            "sgstRate": self.sgst_rate,
            "sgstAmount": self.sgst_amount,
            "igstRate": self.igst_rate,
            "igstAmount": self.igst_amount,
            "totalTax": self.total_tax,
            "totalAmount": self.total_amount,
            "currency": self.currency
        }

    @property
    def gst_breakdown(self) -> Dict[str, float]:
        return {
            "cgst": self.cgst_amount,
            "sgst": self.sgst_amount,
            "igst": self.igst_amount
        }


class TaxCalculationService:
    """Service class for Indian statutory tax calculations (OCP & SRP)."""

    DEFAULT_AGRI_GST_RATE = 0.05  # 5% inclusive on branded/packaged foodstuffs

    @classmethod
    def is_intra_state(cls, state: Optional[str]) -> bool:
        """Determines if destination is intra-state (Maharashtra origin)."""
        if not state:
            return True
        st = str(state).strip().lower()
        return st in MAHARASHTRA_STATE_VARIANTS or "maharashtra" in st

    @classmethod
    def get_commodity_hsn(cls, commodity_name: Optional[str]) -> str:
        """Resolves official HSN code for a given commodity description."""
        if not commodity_name:
            return "0713"
        clean = str(commodity_name).lower().strip()
        # Sort keys by length descending so specific multi-word phrases match first
        # e.g., "jowar flour" (1102) matches before "jowar" (1008)
        # 1. First pass: word-boundary match prevents "tur" matching "turmeric"
        for key in sorted(COMMODITY_HSN_MAP.keys(), key=len, reverse=True):
            pattern = r'(?:\b|_)' + re.escape(key) + r'(?:\b|_)'
            if re.search(pattern, clean):
                return COMMODITY_HSN_MAP[key]
        # 2. Second pass: substring match for compound descriptions without spaces (only keys with length >= 4)
        for key in sorted(COMMODITY_HSN_MAP.keys(), key=len, reverse=True):
            if len(key) >= 4 and key in clean:
                return COMMODITY_HSN_MAP[key]
        return "0713"

    @classmethod
    def compute_tax(
        cls,
        total_amount: float,
        quantity: int = 1,
        state: str = "Maharashtra",
        commodity_name: str = "Classic Toor (Tur Dal)",
        gst_rate: float = DEFAULT_AGRI_GST_RATE
    ) -> TaxComputationResult:
        """
        Decomposes gross invoice total into taxable base and statutory GST components.
        Applies either intra-state CGST + SGST split or interstate IGST.
        """
        try:
            tot = float(total_amount)
            if tot < 0:
                tot = 0.0
        except (ValueError, TypeError):
            tot = 0.0

        try:
            qty = max(1, int(quantity))
        except (ValueError, TypeError):
            qty = 1

        taxable_value = round(tot / (1.0 + gst_rate), 2)
        total_tax = round(tot - taxable_value, 2)

        intra_state = cls.is_intra_state(state)
        if intra_state:
            cgst_rate = gst_rate / 2.0
            sgst_rate = gst_rate / 2.0
            igst_rate = 0.0
            cgst_amount = round(total_tax / 2.0, 2)
            sgst_amount = round(total_tax - cgst_amount, 2)
            igst_amount = 0.0
        else:
            cgst_rate = 0.0
            sgst_rate = 0.0
            igst_rate = gst_rate
            cgst_amount = 0.0
            sgst_amount = 0.0
            igst_amount = total_tax

        rate_per_unit = round(taxable_value / qty, 2)
        hsn = cls.get_commodity_hsn(commodity_name)

        return TaxComputationResult(
            total_amount=tot,
            taxable_value=taxable_value,
            total_tax=total_tax,
            is_intra_state=intra_state,
            is_interstate=not intra_state,
            cgst_rate=cgst_rate,
            cgst_amount=cgst_amount,
            sgst_rate=sgst_rate,
            sgst_amount=sgst_amount,
            igst_rate=igst_rate,
            igst_amount=igst_amount,
            rate_per_unit=rate_per_unit,
            hsn_code=hsn
        )

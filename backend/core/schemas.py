"""
Golden Global Expo — API Contract & Runtime Schema Validation
Strict Pydantic schemas validating all incoming requests and outbound responses.
"""

from typing import Optional, List, Dict, Any, Union, Type
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
import re


# ================= 1. INQUIRY SCHEMAS =================

class InquiryCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    email: str = Field(..., min_length=3, max_length=128)
    phone: Optional[str] = Field(default="", max_length=64)
    company: Optional[str] = Field(default="", max_length=128)
    country: Optional[str] = Field(default="", max_length=128)
    address: Optional[str] = Field(default="", max_length=1000)
    commodities: Optional[str] = Field(default="", max_length=256)
    volume: Optional[str] = Field(default="", max_length=128)
    incoterms: Optional[str] = Field(default="CIF", max_length=64)
    payable: Optional[str] = Field(default="", max_length=64)
    status: Optional[str] = Field(default="New RFQ", max_length=64)
    type: Optional[str] = Field(default="BULK_INQUIRY", max_length=32)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean:
            raise ValueError("Invalid email format.")
        return clean

    @field_validator("name")
    @classmethod
    def validate_name_not_empty(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Name cannot be blank.")
        return clean


class InquiryResponseSchema(BaseModel):
    id: str
    name: str
    company: Optional[str] = ""
    email: str
    phone: Optional[str] = ""
    country: Optional[str] = ""
    address: Optional[str] = ""
    commodities: Optional[str] = ""
    volume: Optional[str] = ""
    incoterms: Optional[str] = "CIF"
    payable: Optional[str] = ""
    status: Optional[str] = "New RFQ"
    blCode: Optional[str] = ""
    date: Optional[str] = ""
    createdAt: Optional[float] = 0.0


# ================= 2. DOMESTIC ORDER SCHEMAS =================

class DomesticOrderCreateSchema(BaseModel):
    commodity: str = Field(..., min_length=2, max_length=256)
    packSize: Optional[str] = Field(default="1kg", max_length=32)
    quantity: int = Field(default=1, ge=1, le=10000)
    amount: Optional[float] = Field(default=None, ge=1.0, le=1000000.0)
    consigneeName: Optional[str] = Field(default="", max_length=128)
    name: Optional[str] = Field(default="", max_length=128)
    consigneePhone: Optional[str] = Field(default="", max_length=64)
    phone: Optional[str] = Field(default="", max_length=64)
    consigneeEmail: Optional[str] = Field(default="", max_length=128)
    email: Optional[str] = Field(default="", max_length=128)
    deliveryAddress: Optional[str] = Field(default="", max_length=1000)
    address: Optional[str] = Field(default="", max_length=1000)
    city: Optional[str] = Field(default="Mumbai", max_length=128)
    state: Optional[str] = Field(default="Maharashtra", max_length=128)
    pincode: Optional[str] = Field(default="", max_length=32)
    gstin: Optional[str] = Field(default="", max_length=64)
    is_mock: Optional[Union[bool, str]] = False

    @field_validator("quantity")
    @classmethod
    def validate_positive_quantity(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1 unit.")
        return v


class DomesticOrderVerifyUpiSchema(BaseModel):
    orderId: Optional[str] = Field(default=None, max_length=64)
    order_id: Optional[str] = Field(default=None, max_length=64)
    utr: Optional[str] = Field(default=None, max_length=64)
    paymentId: Optional[str] = Field(default=None, max_length=64)
    payment_id: Optional[str] = Field(default=None, max_length=64)
    upi_ref: Optional[str] = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def check_required_fields(self):
        oid = self.orderId or self.order_id
        ref = self.utr or self.paymentId or self.payment_id or self.upi_ref
        if not oid or not str(oid).strip():
            raise ValueError("Order ID is required to confirm UPI payment.")
        if not ref or len(str(ref).strip()) < 4:
            raise ValueError("Valid UPI Reference Number / UTR is required (min 4 characters).")
        return self


# ================= 3. COMMODITY & PRICING SCHEMAS =================

class CommodityPriceItemSchema(BaseModel):
    name: Optional[str] = Field(default="", max_length=128)
    category: Optional[str] = Field(default="Agri", max_length=64)
    price: Optional[float] = Field(default=0.0, ge=0.0, le=100000.0)
    baseUsd: Optional[float] = Field(default=0.0, ge=0.0, le=100000.0)
    marginPct: Optional[float] = Field(default=0.0, ge=0.0, le=500.0)


class CommoditySpecificationSchema(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=128)
    botanical: Optional[str] = Field(default="", max_length=128)
    category: Optional[str] = Field(default="Pulses", max_length=64)
    image: Optional[str] = Field(default="", max_length=256)
    hsCode: Optional[str] = Field(default="0713.90.00", max_length=32)
    origin: Optional[str] = Field(default="Maharashtra / Karnataka (India)", max_length=128)
    crop: Optional[str] = Field(default="2025/2026 Crop", max_length=128)
    harvestSeason: Optional[str] = Field(default="", max_length=128)
    purity: Optional[str] = Field(default="99.5% Min", max_length=64)
    moisture: Optional[str] = Field(default="11.0% Max", max_length=64)
    foreignMatter: Optional[str] = Field(default="0.1% Max", max_length=64)
    protein: Optional[str] = Field(default="", max_length=64)
    packing: Optional[str] = Field(default="25kg / 50kg PP Woven Bags", max_length=128)
    loadability: Optional[str] = Field(default="20' FCL Load: 24.0 MT", max_length=128)
    shelfLife: Optional[str] = Field(default="24 Months", max_length=64)
    certifications: Optional[str] = Field(default="APEDA, FSSAI Export Standards", max_length=256)
    baseUsd: Optional[float] = Field(default=850.0, ge=0.01, le=100000.0)
    domesticPacks: Optional[Dict[str, Any]] = Field(default_factory=dict)
    coaUrl: Optional[str] = Field(default="", max_length=256)
    isActive: Optional[bool] = True


# ================= 4. AUTHENTICATION SCHEMAS =================

class AuthLoginStep1Schema(BaseModel):
    email: str = Field(..., min_length=3, max_length=128)
    password: str = Field(..., min_length=1, max_length=128)


class AuthVerifyOtpSchema(BaseModel):
    email: str = Field(..., min_length=3, max_length=128)
    otp: Optional[str] = Field(default="", max_length=32)
    code: Optional[str] = Field(default="", max_length=32)
    role: Optional[str] = Field(default="admin", max_length=32)

    @model_validator(mode="after")
    def check_otp_present(self):
        c = (self.otp or self.code or "").strip()
        if not c:
            raise ValueError("Security code is required.")
        return self


# ================= 5. OBSERVABILITY & HEALTH SCHEMAS =================

class HealthzResponseSchema(BaseModel):
    status: str = "ok"
    app: str = "Golden Global Expo API"
    version: str
    timestamp: float
    uptimeSeconds: int


class ReadyzResponseSchema(BaseModel):
    status: str
    database: str
    db_latency_ms: float
    storage: str
    timestamp: float
    checks: Dict[str, str]


# ================= 6. VALIDATION HELPER =================

def validate_schema(schema_cls: Type[BaseModel], data: Any) -> BaseModel:
    """
    Validates dictionary payload against Pydantic schema class.
    Raises ValueError with formatted validation error messages on failure.
    """
    try:
        return schema_cls.model_validate(data)
    except Exception as e:
        raise ValueError(f"Schema validation error: {str(e)}")

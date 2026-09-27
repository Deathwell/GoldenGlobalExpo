"""
Golden Global Expo — Domain Services Package
Exports domain service layers, design pattern abstractions, and event publisher.
"""
from backend.services.tax_service import TaxCalculationService, TaxComputationResult
from backend.services.invoice_builder import InvoiceBuilder, SELLER_DETAILS
from backend.services.event_dispatcher import (
    DomainEvent, DomainEventPublisher, EventSubscriber,
    SSEBroadcasterSubscriber, AuditLogSubscriber, FlatFileMirrorSubscriber,
    OrderPlacedEvent, PaymentVerifiedEvent, ConsignmentUpdatedEvent,
    ConsignmentDispatchedEvent, DomesticOrderUpdatedEvent, InquiryCreatedEvent,
    get_event_publisher
)
from backend.services.payment_strategies import (
    PaymentStrategy, RazorpayStrategy, MockPaymentStrategy,
    FreightCollectStrategy, ProformaWireStrategy, PaymentStrategyFactory
)
from backend.services.domestic_order_service import (
    DomesticOrderService, DOMESTIC_COMMODITY_SCHEDULE, ALLOWED_PACKS, COMMODITY_ALIASES
)
from backend.services.consignment_service import ConsignmentService
from backend.services.inquiry_service import InquiryService

__all__ = [
    "TaxCalculationService",
    "TaxComputationResult",
    "InvoiceBuilder",
    "SELLER_DETAILS",
    "DomainEvent",
    "DomainEventPublisher",
    "EventSubscriber",
    "SSEBroadcasterSubscriber",
    "AuditLogSubscriber",
    "FlatFileMirrorSubscriber",
    "OrderPlacedEvent",
    "PaymentVerifiedEvent",
    "ConsignmentUpdatedEvent",
    "ConsignmentDispatchedEvent",
    "DomesticOrderUpdatedEvent",
    "InquiryCreatedEvent",
    "get_event_publisher",
    "PaymentStrategy",
    "RazorpayStrategy",
    "MockPaymentStrategy",
    "FreightCollectStrategy",
    "ProformaWireStrategy",
    "PaymentStrategyFactory",
    "DomesticOrderService",
    "DOMESTIC_COMMODITY_SCHEDULE",
    "ALLOWED_PACKS",
    "COMMODITY_ALIASES",
    "ConsignmentService",
    "InquiryService",
]

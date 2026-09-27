"""
Golden Global Expo — Domain Event Dispatcher & Observer Pattern
Centralized domain event bus decoupling business state transitions from
SSE broadcasting, cryptographic audit logging, and flat file mirrors (Observer & SRP).
"""
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Type

from backend.core.events import broadcast_sse
from backend.core.atomic_io import atomic_json_write
from backend.db import DATA_DIR, InquiryModel, ConsignmentModel, AuditLogModel, DomesticOrderModel

@dataclass
class DomainEvent:
    """Base domain event container carrying state transition telemetry."""
    event_name: str
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    operator: Optional[str] = None
    entity_id: Optional[str] = None
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    audit_details: Optional[str] = None
    skip_audit: bool = False
    skip_sse: bool = False
    skip_mirror: bool = False

# Strongly typed domain events (OCP)
class OrderPlacedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any], operator: str = "System", skip_audit: bool = True, **kwargs):
        super().__init__(
            event_name="ORDER_PLACED",
            data=data,
            operator=operator,
            entity_id=data.get("orderId") or data.get("id"),
            previous_state="NONE",
            new_state="PENDING",
            audit_details=f"Domestic order placed: {data.get('orderId')}",
            skip_audit=skip_audit,
            **kwargs
        )

class PaymentVerifiedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any], operator: str = "Payment Gateway", **kwargs):
        super().__init__(
            event_name="PAYMENT_CONFIRMED",
            data=data,
            operator=operator,
            entity_id=data.get("orderId"),
            previous_state="PENDING",
            new_state="CAPTURED",
            audit_details=f"Payment verified for order: {data.get('orderId')}",
            **kwargs
        )

class DomesticPaymentVerifiedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any], operator: str = "NPCI UPI Gateway (Instant Settlement)", **kwargs):
        super().__init__(
            event_name="DOMESTIC_ORDER_PAID_UPI",
            data=data,
            operator=operator,
            entity_id=data.get("orderId"),
            previous_state="UPI_INITIATED",
            new_state=f"PAID_₹{float(data.get('amount', 0.0)):.2f}_CAPTURED",
            audit_details=f"UPI UTR: {data.get('paymentId')} | Consignee: {data.get('name', 'Buyer')} | Order: {data.get('orderId')}",
            **kwargs
        )

class ConsignmentUpdatedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any], operator: str = "Logistics Desk", **kwargs):
        super().__init__(
            event_name="CONSIGNMENT_UPDATED",
            data=data,
            operator=operator,
            entity_id=data.get("bl") or data.get("orderId"),
            audit_details="Consignment manifest or stage progression updated",
            **kwargs
        )

class ConsignmentDispatchedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any], operator: str = "Logistics Desk", **kwargs):
        super().__init__(
            event_name="CONSIGNMENT_DISPATCHED",
            data=data,
            operator=operator,
            entity_id=data.get("bl") or data.get("orderId"),
            previous_state="PREPARING",
            new_state="DISPATCHED",
            audit_details=f"Consignment dispatched with tracking: {data.get('trackingNumber')}",
            **kwargs
        )

class DomesticOrderUpdatedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any], operator: str = "Trade Desk Admin", **kwargs):
        super().__init__(
            event_name="DOMESTIC_ORDER_UPDATED",
            data=data,
            operator=operator,
            entity_id=data.get("orderId") or data.get("id"),
            audit_details=f"Domestic order {data.get('orderId')} updated to status: {data.get('status')}",
            **kwargs
        )

class InquiryCreatedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any], operator: str = "Public Commercial Buyer", **kwargs):
        super().__init__(
            event_name="NEW_INQUIRY",
            data=data,
            operator=operator,
            entity_id=data.get("id"),
            previous_state="NONE",
            new_state="ACTIVE_RFQ",
            audit_details=f"Commercial inquiry submitted: {data.get('id')}",
            **kwargs
        )


class EventSubscriber(ABC):
    """Abstract Observer contract for domain event consumption."""
    @abstractmethod
    def handle(self, event: DomainEvent, session=None):
        pass


class SSEBroadcasterSubscriber(EventSubscriber):
    """Broadcasts domain event payloads in real-time to active SSE clients."""
    def handle(self, event: DomainEvent, session=None):
        if not event.skip_sse:
            broadcast_sse(event.event_name, event.data)


class AuditLogSubscriber(EventSubscriber):
    """Records tamper-evident cryptographic audit logs for business operations."""
    def handle(self, event: DomainEvent, session=None):
        if event.skip_audit or not event.entity_id or not session:
            return
        from backend.repositories.audit_repo import AuditRepository
        try:
            repo = AuditRepository(session)
            repo.append_entry(
                operator=event.operator or "System Event Bus",
                action=event.event_name,
                entity_id=event.entity_id,
                prev_state=event.previous_state or "ACTIVE",
                new_state=event.new_state or "UPDATED",
                details=event.audit_details or f"Domain event triggered: {event.event_name}"
            )
            session.commit()
        except Exception as e:
            # Audit subscriber should log warning without failing transaction
            print(f"[AUDIT SUBSCRIBER WARNING] Failed to append event audit: {e}")


class FlatFileMirrorSubscriber(EventSubscriber):
    """Synchronizes SQLite ACID state to JSON flat files in DATA_DIR for cold backup."""
    def handle(self, event: DomainEvent, session=None):
        if event.skip_mirror or not session:
            return
        try:
            if event.event_name in ["NEW_INQUIRY", "INQUIRY_DELETED"]:
                inqs = [r.to_dict() for r in session.query(InquiryModel).order_by(InquiryModel.created_at.desc()).all()]
                atomic_json_write(os.path.join(DATA_DIR, 'inquiries.json'), inqs)

            if event.event_name in ["CONSIGNMENT_UPDATED", "CONSIGNMENT_DISPATCHED", "CONSIGNMENT_DELETED"]:
                consigns = [r.to_dict() for r in session.query(ConsignmentModel).order_by(ConsignmentModel.updated_at.desc()).all()]
                atomic_json_write(os.path.join(DATA_DIR, 'consignments.json'), consigns)

            if event.event_name in ["ORDER_PLACED", "PAYMENT_CONFIRMED", "DOMESTIC_ORDER_UPDATED", "DOMESTIC_ORDER_PAID_UPI"]:
                doms = [r.to_dict() for r in session.query(DomesticOrderModel).order_by(DomesticOrderModel.created_at.desc()).all()]
                atomic_json_write(os.path.join(DATA_DIR, 'domestic_orders.json'), doms)

            audits = [r.to_dict() for r in session.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).all()]
            atomic_json_write(os.path.join(DATA_DIR, 'audit_log.json'), audits)
        except Exception as e:
            print(f"[MIRROR SUBSCRIBER WARNING] Error mirroring JSON flat storage: {e}")


class APMMetricsSubscriber(EventSubscriber):
    """Monitors domain event bus throughput, event-specific counts, and telemetry for APM health."""

    def __init__(self):
        self._total_events = 0
        self._counts: Dict[str, int] = {}
        self._last_event_time: Optional[float] = None
        self._last_event_name: Optional[str] = None

    def handle(self, event: DomainEvent, session=None):
        self._total_events += 1
        name = event.event_name
        self._counts[name] = self._counts.get(name, 0) + 1
        self._last_event_time = time.time()
        self._last_event_name = name

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "totalEventsHandled": self._total_events,
            "eventCounts": dict(self._counts),
            "lastEventTime": self._last_event_time,
            "lastEventName": self._last_event_name,
        }


class DomainEventPublisher:
    """Subject/Publisher managing subscribers and notifying them of domain events."""

    def __init__(self):
        self._subscribers: List[EventSubscriber] = []

    def subscribe(self, subscriber: EventSubscriber):
        if subscriber not in self._subscribers:
            self._subscribers.append(subscriber)

    def unsubscribe(self, subscriber: EventSubscriber):
        if subscriber in self._subscribers:
            self._subscribers.remove(subscriber)

    def publish(self, event: DomainEvent, session=None):
        for sub in list(self._subscribers):
            try:
                sub.handle(event, session=session)
            except Exception as e:
                print(f"[EVENT DISPATCH ERROR] Subscriber {sub.__class__.__name__} failed: {e}")


# Default configured singleton publisher and APM observer
_global_event_publisher: Optional[DomainEventPublisher] = None
_global_apm_subscriber: Optional[APMMetricsSubscriber] = None

def get_event_publisher() -> DomainEventPublisher:
    global _global_event_publisher, _global_apm_subscriber
    if _global_event_publisher is None:
        _global_event_publisher = DomainEventPublisher()
        _global_event_publisher.subscribe(SSEBroadcasterSubscriber())
        _global_event_publisher.subscribe(AuditLogSubscriber())
        _global_event_publisher.subscribe(FlatFileMirrorSubscriber())
        _global_apm_subscriber = APMMetricsSubscriber()
        _global_event_publisher.subscribe(_global_apm_subscriber)
    return _global_event_publisher

def get_apm_event_metrics() -> Dict[str, Any]:
    global _global_apm_subscriber
    if _global_apm_subscriber is None:
        get_event_publisher()
    return _global_apm_subscriber.get_metrics() if _global_apm_subscriber else {}


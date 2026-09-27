"""
Golden Global Expo — Repository Pattern Abstractions
Enterprise interface contract for data access, decoupling business domain services
from underlying ORM and persistence mechanisms (DIP & ISP).
"""
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List, Any

T = TypeVar("T")

class BaseRepository(ABC, Generic[T]):
    """Generic base repository providing fundamental persistence contracts."""

    def __init__(self, session):
        self.session = session

    @abstractmethod
    def get_by_id(self, entity_id: Any) -> Optional[T]:
        """Fetch single entity by its primary key identifier."""
        pass

    @abstractmethod
    def find_all(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[T]:
        """Retrieve list of entities with optional pagination."""
        pass

    @abstractmethod
    def save(self, entity: T) -> T:
        """Persist or update an entity instance within transaction boundary."""
        pass

    @abstractmethod
    def delete(self, entity: T) -> bool:
        """Remove entity from persistence context."""
        pass

    @abstractmethod
    def count(self) -> int:
        """Count total persisted entities matching this type."""
        pass

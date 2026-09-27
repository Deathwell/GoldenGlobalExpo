"""
Golden Global Expo — Production Resilience & Fault Handling Engine
Implements Circuit Breakers, Exponential Backoff with Jitter, and Connection Resilience.
"""

import time
import math
import random
import asyncio
import logging
import threading
from enum import Enum
from typing import Callable, Any, Optional, Tuple, Type, Union
from functools import wraps

logger = logging.getLogger("gge.resilience")


class CircuitState(str, Enum):
    CLOSED = "CLOSED"        # Normal operation: traffic flows through
    OPEN = "OPEN"            # Tripped: traffic failed, fast-reject or fallback
    HALF_OPEN = "HALF_OPEN"  # Probe: testing if downstream recovered


class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted while the circuit breaker is OPEN."""
    def __init__(self, message: str = "Circuit breaker is open. Request fast-rejected.", retry_after: float = 0.0):
        super().__init__(message)
        self.retry_after = retry_after


class CircuitBreaker:
    """
    Thread-safe & async-compatible Circuit Breaker.
    Monitors failure rates and prevents cascading failures across external APIs
    and remote downstream dependencies.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_success_threshold: int = 2,
        expected_exceptions: Tuple[Type[BaseException], ...] = (Exception,),
        fallback: Optional[Callable[..., Any]] = None
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_success_threshold = half_open_success_threshold
        self.expected_exceptions = expected_exceptions
        self.fallback = fallback

        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._consecutive_successes = 0
        self._last_failure_time = 0.0
        self._last_state_change = time.time()
        self._total_calls = 0
        self._total_failures = 0
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            self._evaluate_state_transition()
            return self._state

    def _evaluate_state_transition(self):
        """Internal: evaluates if OPEN timeout has expired to transition to HALF_OPEN."""
        now = time.time()
        if self._state == CircuitState.OPEN:
            if now - self._last_failure_time >= self.recovery_timeout:
                logger.info(f"[CIRCUIT BREAKER] {self.name}: Recovery timeout ({self.recovery_timeout}s) elapsed. Transitioning OPEN -> HALF_OPEN.")
                self._state = CircuitState.HALF_OPEN
                self._consecutive_successes = 0
                self._last_state_change = now

    def record_success(self):
        """Records a successful execution."""
        with self._lock:
            self._total_calls += 1
            if self._state == CircuitState.HALF_OPEN:
                self._consecutive_successes += 1
                if self._consecutive_successes >= self.half_open_success_threshold:
                    logger.info(f"[CIRCUIT BREAKER] {self.name}: Probe threshold ({self.half_open_success_threshold}) satisfied. Transitioning HALF_OPEN -> CLOSED.")
                    self._state = CircuitState.CLOSED
                    self._consecutive_failures = 0
                    self._consecutive_successes = 0
                    self._last_state_change = time.time()
            elif self._state == CircuitState.CLOSED:
                self._consecutive_failures = 0

    def record_failure(self, exc: BaseException):
        """Records an execution failure and trips circuit if threshold reached."""
        with self._lock:
            self._total_calls += 1
            self._total_failures += 1
            now = time.time()
            self._last_failure_time = now

            if self._state == CircuitState.HALF_OPEN:
                logger.warning(f"[CIRCUIT BREAKER] {self.name}: Probe failed ({exc}). Tripping HALF_OPEN -> OPEN immediately.")
                self._state = CircuitState.OPEN
                self._last_state_change = now
            elif self._state == CircuitState.CLOSED:
                self._consecutive_failures += 1
                if self._consecutive_failures >= self.failure_threshold:
                    logger.error(
                        f"[CIRCUIT BREAKER] {self.name}: Failure threshold reached ({self._consecutive_failures}/{self.failure_threshold}). "
                        f"Tripping CLOSED -> OPEN for {self.recovery_timeout}s."
                    )
                    self._state = CircuitState.OPEN
                    self._last_state_change = now

    def can_execute(self) -> Tuple[bool, float]:
        """Returns (can_execute: bool, retry_after: float)."""
        with self._lock:
            self._evaluate_state_transition()
            if self._state == CircuitState.OPEN:
                remaining = max(0.1, self.recovery_timeout - (time.time() - self._last_failure_time))
                return False, round(remaining, 1)
            return True, 0.0

    def get_diagnostics(self) -> dict:
        """Returns operational metrics for telemetry dashboards."""
        with self._lock:
            self._evaluate_state_transition()
            return {
                "name": self.name,
                "state": self._state.value,
                "consecutiveFailures": self._consecutive_failures,
                "failureThreshold": self.failure_threshold,
                "recoveryTimeoutSeconds": self.recovery_timeout,
                "totalCalls": self._total_calls,
                "totalFailures": self._total_failures,
                "lastFailureTime": self._last_failure_time
            }

    def __call__(self, func: Callable):
        """Decorator supporting both sync and async functions."""
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                can_run, retry_after = self.can_execute()
                if not can_run:
                    if self.fallback is not None:
                        if asyncio.iscoroutinefunction(self.fallback):
                            return await self.fallback(*args, **kwargs)
                        return self.fallback(*args, **kwargs)
                    raise CircuitBreakerOpenException(
                        f"Circuit breaker '{self.name}' is OPEN. Retry in {retry_after}s.",
                        retry_after=retry_after
                    )
                try:
                    result = await func(*args, **kwargs)
                    self.record_success()
                    return result
                except self.expected_exceptions as e:
                    self.record_failure(e)
                    if self.fallback is not None:
                        if asyncio.iscoroutinefunction(self.fallback):
                            return await self.fallback(*args, **kwargs)
                        return self.fallback(*args, **kwargs)
                    raise
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                can_run, retry_after = self.can_execute()
                if not can_run:
                    if self.fallback is not None:
                        return self.fallback(*args, **kwargs)
                    raise CircuitBreakerOpenException(
                        f"Circuit breaker '{self.name}' is OPEN. Retry in {retry_after}s.",
                        retry_after=retry_after
                    )
                try:
                    result = func(*args, **kwargs)
                    self.record_success()
                    return result
                except self.expected_exceptions as e:
                    self.record_failure(e)
                    if self.fallback is not None:
                        return self.fallback(*args, **kwargs)
                    raise
            return sync_wrapper


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 0.2,
    backoff_factor: float = 2.0,
    max_delay: float = 5.0,
    jitter: bool = True,
    allowed_exceptions: Tuple[Type[BaseException], ...] = (Exception,)
):
    """
    Decorator executing retry logic with full jitter exponential backoff.
    Works transparently with both synchronous and asynchronous callables.
    """
    def decorator(func: Callable):
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_retry_wrapper(*args, **kwargs):
                delay = initial_delay
                last_exc = None
                for attempt in range(1, max_retries + 1):
                    try:
                        return await func(*args, **kwargs)
                    except allowed_exceptions as exc:
                        last_exc = exc
                        if attempt == max_retries:
                            logger.error(f"[RETRY EXHAUSTED] {func.__name__} failed after {max_retries} attempts: {exc}")
                            raise
                        sleep_dur = delay
                        if jitter:
                            sleep_dur = delay * (0.8 + 0.4 * random.random())
                        sleep_dur = min(sleep_dur, max_delay)
                        logger.warning(
                            f"[RETRY ATTEMPT {attempt}/{max_retries}] {func.__name__} encountered {type(exc).__name__}: {exc}. "
                            f"Sleeping {sleep_dur:.2f}s before retry."
                        )
                        await asyncio.sleep(sleep_dur)
                        delay = min(delay * backoff_factor, max_delay)
                raise last_exc
            return async_retry_wrapper
        else:
            @wraps(func)
            def sync_retry_wrapper(*args, **kwargs):
                delay = initial_delay
                last_exc = None
                for attempt in range(1, max_retries + 1):
                    try:
                        return func(*args, **kwargs)
                    except allowed_exceptions as exc:
                        last_exc = exc
                        if attempt == max_retries:
                            logger.error(f"[RETRY EXHAUSTED] {func.__name__} failed after {max_retries} attempts: {exc}")
                            raise
                        sleep_dur = delay
                        if jitter:
                            sleep_dur = delay * (0.8 + 0.4 * random.random())
                        sleep_dur = min(sleep_dur, max_delay)
                        logger.warning(
                            f"[RETRY ATTEMPT {attempt}/{max_retries}] {func.__name__} encountered {type(exc).__name__}: {exc}. "
                            f"Sleeping {sleep_dur:.2f}s before retry."
                        )
                        time.sleep(sleep_dur)
                        delay = min(delay * backoff_factor, max_delay)
                raise last_exc
            return sync_retry_wrapper
    return decorator


# Pre-configured Global Circuit Breakers for Subsystems
FOREX_CIRCUIT_BREAKER = CircuitBreaker(
    name="forex_upstream_service",
    failure_threshold=3,
    recovery_timeout=60.0,
    half_open_success_threshold=1
)

GEO_IP_CIRCUIT_BREAKER = CircuitBreaker(
    name="geo_ip_lookup_service",
    failure_threshold=4,
    recovery_timeout=90.0,
    half_open_success_threshold=1
)

"""
Tests for Production Resilience Engine: CircuitBreaker & Retry with Exponential Backoff
"""

import time
import pytest
import asyncio
from backend.core.resilience import (
    CircuitBreaker,
    CircuitState,
    CircuitBreakerOpenException,
    retry_with_backoff,
    FOREX_CIRCUIT_BREAKER,
    GEO_IP_CIRCUIT_BREAKER
)


def test_circuit_breaker_initial_state_closed():
    cb = CircuitBreaker(name="test_cb_init", failure_threshold=3, recovery_timeout=1.0)
    assert cb.state == CircuitState.CLOSED
    can_run, retry_after = cb.can_execute()
    assert can_run is True
    assert retry_after == 0.0


def test_circuit_breaker_trips_to_open_after_threshold():
    cb = CircuitBreaker(name="test_cb_trip", failure_threshold=3, recovery_timeout=2.0)
    
    # 2 failures do not trip
    cb.record_failure(RuntimeError("error 1"))
    cb.record_failure(RuntimeError("error 2"))
    assert cb.state == CircuitState.CLOSED

    # 3rd failure trips the breaker to OPEN
    cb.record_failure(RuntimeError("error 3"))
    assert cb.state == CircuitState.OPEN

    can_run, retry_after = cb.can_execute()
    assert can_run is False
    assert retry_after > 0.0


def test_circuit_breaker_fast_reject_decorator():
    cb = CircuitBreaker(name="test_cb_fast_reject", failure_threshold=2, recovery_timeout=5.0)

    @cb
    def flaky_service():
        raise ConnectionResetError("Connection dropped by peer")

    # First call fails and records failure
    with pytest.raises(ConnectionResetError):
        flaky_service()

    # Second call fails and trips breaker
    with pytest.raises(ConnectionResetError):
        flaky_service()

    assert cb.state == CircuitState.OPEN

    # Third call should immediately raise CircuitBreakerOpenException without invoking flaky_service
    with pytest.raises(CircuitBreakerOpenException) as exc_info:
        flaky_service()

    assert "is OPEN" in str(exc_info.value)
    assert exc_info.value.retry_after > 0.0


def test_circuit_breaker_fallback_mechanism():
    cb = CircuitBreaker(
        name="test_cb_fallback",
        failure_threshold=2,
        recovery_timeout=5.0,
        fallback=lambda *args, **kwargs: {"status": "fallback_rate", "rate": 83.5}
    )

    @cb
    def failing_api():
        raise TimeoutError("Downstream API timeout")

    # 2 failures to trip
    res1 = failing_api()
    assert res1 == {"status": "fallback_rate", "rate": 83.5}
    res2 = failing_api()
    assert res2 == {"status": "fallback_rate", "rate": 83.5}

    assert cb.state == CircuitState.OPEN

    # Fast-reject triggers fallback without error
    res3 = failing_api()
    assert res3 == {"status": "fallback_rate", "rate": 83.5}


def test_circuit_breaker_half_open_to_closed_recovery():
    cb = CircuitBreaker(name="test_cb_recovery", failure_threshold=2, recovery_timeout=0.1, half_open_success_threshold=2)

    cb.record_failure(Exception("fail 1"))
    cb.record_failure(Exception("fail 2"))
    assert cb.state == CircuitState.OPEN

    # Wait for recovery timeout
    time.sleep(0.15)
    assert cb.state == CircuitState.HALF_OPEN

    # First successful probe
    cb.record_success()
    assert cb.state == CircuitState.HALF_OPEN

    # Second successful probe satisfies threshold -> CLOSED
    cb.record_success()
    assert cb.state == CircuitState.CLOSED


def test_circuit_breaker_half_open_failure_immediately_reopens():
    cb = CircuitBreaker(name="test_cb_half_open_fail", failure_threshold=2, recovery_timeout=0.1)

    cb.record_failure(Exception("fail 1"))
    cb.record_failure(Exception("fail 2"))
    assert cb.state == CircuitState.OPEN

    time.sleep(0.15)
    assert cb.state == CircuitState.HALF_OPEN

    # Any failure in HALF_OPEN immediately trips back to OPEN
    cb.record_failure(Exception("probe failed"))
    assert cb.state == CircuitState.OPEN


def test_retry_with_backoff_sync_success_first_try():
    call_count = 0

    @retry_with_backoff(max_retries=3, initial_delay=0.01)
    def fast_op():
        nonlocal call_count
        call_count += 1
        return "success"

    assert fast_op() == "success"
    assert call_count == 1


def test_retry_with_backoff_sync_transient_failure_then_success():
    call_count = 0

    @retry_with_backoff(max_retries=3, initial_delay=0.01, backoff_factor=1.5)
    def recover_op():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ConnectionError("Transient network glitch")
        return "recovered"

    result = recover_op()
    assert result == "recovered"
    assert call_count == 3


def test_retry_with_backoff_sync_exhaustion():
    call_count = 0

    @retry_with_backoff(max_retries=3, initial_delay=0.01)
    def always_fails():
        nonlocal call_count
        call_count += 1
        raise ValueError("Permanent validation error")

    with pytest.raises(ValueError) as exc:
        always_fails()

    assert "Permanent validation error" in str(exc.value)
    assert call_count == 3


@pytest.mark.asyncio
async def test_retry_with_backoff_async():
    call_count = 0

    @retry_with_backoff(max_retries=3, initial_delay=0.01)
    async def async_fetch():
        nonlocal call_count
        call_count += 1
        if call_count < 2:
            raise TimeoutError("Async timeout")
        return {"data": 42}

    res = await async_fetch()
    assert res == {"data": 42}
    assert call_count == 2


def test_global_circuit_breakers_exist_and_healthy():
    assert FOREX_CIRCUIT_BREAKER.name == "forex_upstream_service"
    assert FOREX_CIRCUIT_BREAKER.state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)
    assert GEO_IP_CIRCUIT_BREAKER.name == "geo_ip_lookup_service"
    assert GEO_IP_CIRCUIT_BREAKER.state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)
    
    diag = FOREX_CIRCUIT_BREAKER.get_diagnostics()
    assert "consecutiveFailures" in diag
    assert "failureThreshold" in diag

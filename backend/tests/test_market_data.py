import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.db.init_db import init_db
from app.services.market_data import (
    can_make_external_call,
    record_external_call,
    _call_timestamps,
    RATE_LIMIT_MAX_CALLS,
)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database tables and seeds are initialized before running tests."""
    init_db()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_get_market_bars_and_sqlite_cache(client):
    from app.db.session import SessionLocal
    from app.models.market_cache import MarketDataCache

    with SessionLocal() as db:
        db.query(MarketDataCache).filter(MarketDataCache.cache_key == "bars:AAPL:30").delete()
        db.commit()

    # First call: May fetch live from Polygon or generate deterministic fallback
    resp1 = client.get("/api/v1/market/bars/AAPL?days=30")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["ticker"] == "AAPL"
    assert len(data1["bars"]) > 0
    assert "disclaimer" in data1
    assert data1["count"] == len(data1["bars"])

    # Second call: Must hit SQLite cache
    resp2 = client.get("/api/v1/market/bars/AAPL?days=30")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["ticker"] == "AAPL"
    assert data2["cached"] is True
    assert data2["data_source"] in ("sqlite_cache", "sqlite_stale_cache")
    assert len(data2["bars"]) == len(data1["bars"])


def test_get_market_quote(client):
    response = client.get("/api/v1/market/quote/NVDA")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "NVDA"
    assert data["price"] > 0
    assert isinstance(data["change_percent"], (int, float))
    assert "disclaimer" in data


def test_rate_limiter_enforces_5_calls_per_minute(client):
    # Clear any past timestamps in deque for test isolation
    _call_timestamps.clear()

    # Simulate 5 calls
    for _ in range(RATE_LIMIT_MAX_CALLS):
        assert can_make_external_call() is True
        record_external_call()

    # 6th call should be blocked from making external HTTP call
    assert can_make_external_call() is False

    # Calling the endpoint still serves data gracefully (from cache or deterministic fallback)
    resp = client.get("/api/v1/market/bars/MSFT?days=30")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ticker"] == "MSFT"
    assert len(data["bars"]) > 0

    # Clean up deque after test
    _call_timestamps.clear()


def test_watchlist_add_and_delete(client):
    # Add new ticker with lowercase to verify uppercase normalization
    post_resp = client.post(
        "/api/v1/market/watchlist",
        json={"ticker": "amd", "company_name": "Advanced Micro Devices"},
    )
    assert post_resp.status_code == 201
    created = post_resp.json()
    assert created["ticker"] == "AMD"
    assert created["company_name"] == "Advanced Micro Devices"

    # Verify duplicate ticker rejection (409 Conflict)
    dup_resp = client.post(
        "/api/v1/market/watchlist",
        json={"ticker": "AMD", "company_name": "Duplicate Entry"},
    )
    assert dup_resp.status_code == 409

    # Delete ticker
    del_resp = client.delete("/api/v1/market/watchlist/AMD")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"

    # Delete non-existent ticker should return 404
    del_404 = client.delete("/api/v1/market/watchlist/NONEXISTENT")
    assert del_404.status_code == 404


def test_cache_status_endpoint(client):
    resp = client.get("/api/v1/market/cache-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["limit_per_minute"] == 5
    assert "calls_in_last_minute" in data
    assert "remaining_calls_per_minute" in data
    assert data["cache_ttl_minutes"] == 60
    assert isinstance(data["has_live_polygon_key"], bool)

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


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database tables and seeds are initialized before running tests."""
    init_db()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["project"] == "FIRASA"
    assert data["database_connected"] is True
    assert data["seeded_watchlist_count"] == 10
    assert "AAPL" in data["default_tickers"]
    assert "NVDA" in data["default_tickers"]


def test_watchlist_endpoint(client):
    response = client.get("/api/v1/watchlist")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 10
    tickers = [item["ticker"] for item in items]
    assert "AAPL" in tickers
    assert "NVDA" in tickers
    assert "MSFT" in tickers


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "FIRASA"
    assert data["status"] == "online"

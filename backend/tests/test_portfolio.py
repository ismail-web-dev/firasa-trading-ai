import os
import sys
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.portfolio import PortfolioHolding


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()


@pytest.fixture(autouse=True)
def clean_portfolio_table():
    """Ensure portfolio table is clean before and after each test."""
    db = SessionLocal()
    db.query(PortfolioHolding).delete()
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(PortfolioHolding).delete()
    db.commit()
    db.close()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_empty_or_initial_portfolio(client):
    response = client.get("/api/v1/portfolio")
    assert response.status_code == 200
    data = response.json()
    assert data["holdings_count"] == 0
    assert data["total_cost_basis"] == 0.0
    assert data["total_market_value"] == 0.0
    assert data["total_unrealized_pl"] == 0.0
    assert data["holdings"] == []
    assert "disclaimer" in data


def test_add_and_value_holdings_math(client):
    # Add AAPL: 10 shares @ $150.0 = $1500 cost basis
    resp1 = client.post(
        "/api/v1/portfolio",
        json={
            "ticker": "AAPL",
            "shares": 10.0,
            "avg_cost_basis": 150.0,
            "notes": "Core tech position",
        },
    )
    assert resp1.status_code == 201
    d1 = resp1.json()
    assert d1["holdings_count"] == 1
    assert d1["total_cost_basis"] == 1500.0

    # Add NVDA: 5 shares @ $100.0 = $500 cost basis
    resp2 = client.post(
        "/api/v1/portfolio",
        json={
            "ticker": "NVDA",
            "shares": 5.0,
            "avg_cost_basis": 100.0,
            "notes": "AI semiconductor exposure",
        },
    )
    assert resp2.status_code == 201
    d2 = resp2.json()
    assert d2["holdings_count"] == 2
    assert d2["total_cost_basis"] == 2000.0

    # Math consistency check: Market Value - Cost Basis == Unrealized PL
    expected_pl = round(d2["total_market_value"] - d2["total_cost_basis"], 2)
    assert abs(expected_pl - d2["total_unrealized_pl"]) < 0.05

    # Allocation weights should sum to ~100.0%
    weights_sum = sum(h["weight_percent"] for h in d2["holdings"])
    assert 99.0 <= weights_sum <= 101.0


def test_update_and_delete_holding(client):
    # Add AAPL: 10 shares @ 150
    post_resp = client.post(
        "/api/v1/portfolio",
        json={"ticker": "AAPL", "shares": 10.0, "avg_cost_basis": 150.0},
    )
    assert post_resp.status_code == 201
    holding_id = post_resp.json()["holdings"][0]["id"]

    # Update to 15 shares @ 150 -> $2250 total cost
    put_resp = client.put(
        f"/api/v1/portfolio/{holding_id}",
        json={"ticker": "AAPL", "shares": 15.0, "avg_cost_basis": 150.0},
    )
    assert put_resp.status_code == 200
    updated = put_resp.json()
    assert updated["total_cost_basis"] == 2250.0
    assert updated["holdings"][0]["shares"] == 15.0

    # Delete holding
    del_resp = client.delete(f"/api/v1/portfolio/{holding_id}")
    assert del_resp.status_code == 200
    after_del = del_resp.json()
    assert after_del["holdings_count"] == 0
    assert after_del["total_market_value"] == 0.0


def test_invalid_holding_validation(client):
    # Negative shares
    resp_neg = client.post(
        "/api/v1/portfolio",
        json={"ticker": "AAPL", "shares": -5.0, "avg_cost_basis": 150.0},
    )
    assert resp_neg.status_code == 422

    # Zero cost basis
    resp_zero = client.post(
        "/api/v1/portfolio",
        json={"ticker": "AAPL", "shares": 10.0, "avg_cost_basis": 0.0},
    )
    assert resp_zero.status_code == 422

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

VALID_SETUPS = [
    "OVERSOLD_REVERSAL_WATCH",
    "BULLISH_TREND_MOMENTUM",
    "OVERBOUGHT_PULLBACK_WATCH",
    "MEAN_REVERSION_WATCH",
]


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()


@pytest.fixture(autouse=True)
def clean_portfolio_table():
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


def test_phase8_market_analysis_endpoint(client):
    """Test AI Market Analysis endpoint with deterministic technical grounding."""
    resp = client.get("/api/v1/ai/analyze/AAPL")
    assert resp.status_code == 200
    data = resp.json()

    assert data["ticker"] == "AAPL"
    assert data["bias"] in ["BULLISH", "BEARISH", "NEUTRAL"]
    assert 0 <= data["confidence_score"] <= 100
    assert len(data["technical_breakdown"]) > 0
    assert len(data["risk_factors"]) > 0
    assert len(data["executive_summary"]) > 0

    # Key deterministic levels
    key_levels = data["key_levels"]
    metrics = data["deterministic_metrics"]
    assert "current_price" in key_levels
    assert "support_estimate" in key_levels
    assert "resistance_estimate" in key_levels
    assert "sma_20" in key_levels
    assert "sma_50" in key_levels

    # Exact match between key_levels["current_price"] and deterministic metrics close
    assert key_levels["current_price"] == round(metrics["close"], 2)
    assert "disclaimer" in data
    assert "model_used" in data


def test_phase9_portfolio_risk_audit_endpoint(client):
    """Test AI Portfolio Risk Auditor endpoint with concentration and regime cross-checks."""
    # Test empty portfolio first
    resp_empty = client.get("/api/v1/ai/portfolio-audit")
    assert resp_empty.status_code == 200
    data_empty = resp_empty.json()
    assert data_empty["overall_risk_level"] == "LOW"
    assert data_empty["risk_score"] == 0

    # Add a concentrated test holding: NVDA 10 shares @ 100
    client.post(
        "/api/v1/portfolio",
        json={
            "ticker": "NVDA",
            "shares": 10.0,
            "avg_cost_basis": 100.0,
            "notes": "Single concentrated holding",
        },
    )

    resp = client.get("/api/v1/ai/portfolio-audit")
    assert resp.status_code == 200
    data = resp.json()

    assert data["overall_risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert 0 <= data["risk_score"] <= 100
    assert len(data["concentration_analysis"]) > 0
    assert len(data["technical_exposure_warnings"]) > 0
    assert len(data["diversification_suggestions"]) > 0
    assert data["portfolio_snapshot"]["holdings_count"] == 1
    assert data["portfolio_snapshot"]["top_holding"] == "NVDA"
    assert data["portfolio_snapshot"]["top_holding_weight"] == 100.0
    assert "disclaimer" in data


def test_phase10_opportunity_scanner_endpoint(client):
    """Test AI Opportunity Scanner endpoint across the universe."""
    resp = client.get("/api/v1/ai/opportunities")
    assert resp.status_code == 200
    data = resp.json()

    assert data["scanned_count"] >= 1
    assert len(data["candidates"]) >= 1
    assert "market_regime_summary" in data

    candidate = data["candidates"][0]
    assert candidate["ticker"] != ""
    assert candidate["price"] > 0
    assert candidate["setup_type"] in VALID_SETUPS
    assert 0 <= candidate["signal_strength"] <= 100
    assert len(candidate["ai_rationale"]) > 0
    assert candidate["trend_regime"] in ["BULLISH", "BEARISH", "NEUTRAL"]

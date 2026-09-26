import os
import sys
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.db.init_db import init_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_get_indicators_endpoint(client):
    response = client.get("/api/v1/market/indicators/AAPL?days=120")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert "series" in data
    assert len(data["series"]) >= 60

    latest = data["latest"]
    assert latest["sma_20"] is not None
    assert latest["sma_50"] is not None
    assert latest["rsi_14"] is not None
    assert latest["macd"] is not None
    assert latest["macd_signal"] is not None
    assert latest["macd_hist"] is not None
    assert "disclaimer" in data


def test_rsi_bounds_and_macd_math(client):
    response = client.get("/api/v1/market/indicators/NVDA?days=120")
    assert response.status_code == 200
    data = response.json()
    series = data["series"]
    latest = data["latest"]

    # Verify RSI bounds: 0.0 <= rsi <= 100.0
    valid_rsi_points = [p for p in series if p["rsi_14"] is not None]
    assert len(valid_rsi_points) > 0
    for p in valid_rsi_points:
        assert 0.0 <= p["rsi_14"] <= 100.0

    # Verify MACD identity: macd - macd_signal = macd_hist
    valid_macd_points = [
        p for p in series if p["macd"] is not None and p["macd_signal"] is not None and p["macd_hist"] is not None
    ]
    assert len(valid_macd_points) > 0
    for p in valid_macd_points:
        expected_hist = p["macd"] - p["macd_signal"]
        assert abs(expected_hist - p["macd_hist"]) < 1e-3

    # Verify Snapshot Enums
    assert latest["rsi_state"] in ["OVERBOUGHT", "OVERSOLD", "NEUTRAL"]
    assert latest["macd_state"] in [
        "BULLISH_CROSS",
        "BEARISH_CROSS",
        "BULLISH_MOMENTUM",
        "BEARISH_MOMENTUM",
        "NEUTRAL",
    ]
    assert latest["trend_regime"] in ["BULLISH", "BEARISH", "SIDEWAYS"]

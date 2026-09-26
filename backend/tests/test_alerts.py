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
from app.models.alert import AlertRule


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()


@pytest.fixture(autouse=True)
def clean_alerts_table():
    db = SessionLocal()
    db.query(AlertRule).delete()
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(AlertRule).delete()
    db.commit()
    db.close()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_create_and_evaluate_price_alerts(client):
    # Create guaranteed triggering alert: AAPL > $1.00
    resp1 = client.post(
        "/api/v1/alerts",
        json={
            "ticker": "AAPL",
            "condition_type": "PRICE_ABOVE",
            "threshold_value": 1.0,
        },
    )
    assert resp1.status_code == 201
    d1 = resp1.json()
    assert d1["total_alerts"] == 1
    assert d1["triggered_count"] == 1
    aapl_alert = d1["alerts"][0]
    assert aapl_alert["ticker"] == "AAPL"
    assert aapl_alert["is_triggered"] is True
    assert aapl_alert["triggered_at"] is not None
    assert "TRIGGERED" in aapl_alert["status_message"]

    # Create guaranteed non-triggering alert: AAPL > $999999.00
    resp2 = client.post(
        "/api/v1/alerts",
        json={
            "ticker": "AAPL",
            "condition_type": "PRICE_ABOVE",
            "threshold_value": 999999.0,
        },
    )
    assert resp2.status_code == 201
    d2 = resp2.json()
    assert d2["total_alerts"] == 2
    assert d2["active_count"] == 2


def test_create_rsi_and_sma_alerts(client):
    # RSI alert
    resp_rsi = client.post(
        "/api/v1/alerts",
        json={
            "ticker": "NVDA",
            "condition_type": "RSI_BELOW",
            "threshold_value": 99.0,
        },
    )
    assert resp_rsi.status_code == 201
    d_rsi = resp_rsi.json()
    alert_item = [a for a in d_rsi["alerts"] if a["ticker"] == "NVDA"][0]
    assert alert_item["current_metric_value"] is not None

    # SMA Cross alert
    resp_sma = client.post(
        "/api/v1/alerts",
        json={
            "ticker": "MSFT",
            "condition_type": "SMA20_ABOVE_SMA50",
            "threshold_value": 0.0,
        },
    )
    assert resp_sma.status_code == 201
    d_sma = resp_sma.json()
    sma_item = [a for a in d_sma["alerts"] if a["ticker"] == "MSFT"][0]
    assert sma_item["current_metric_value"] is not None


def test_invalid_alert_validation(client):
    # RSI > 100
    r1 = client.post(
        "/api/v1/alerts",
        json={
            "ticker": "AAPL",
            "condition_type": "RSI_ABOVE",
            "threshold_value": 150.0,
        },
    )
    assert r1.status_code == 422

    # Negative price
    r2 = client.post(
        "/api/v1/alerts",
        json={
            "ticker": "AAPL",
            "condition_type": "PRICE_BELOW",
            "threshold_value": -10.0,
        },
    )
    assert r2.status_code == 422


def test_toggle_and_delete_alert(client):
    # Create an alert
    post_resp = client.post(
        "/api/v1/alerts",
        json={
            "ticker": "AAPL",
            "condition_type": "PRICE_ABOVE",
            "threshold_value": 1.0,
        },
    )
    alert_id = post_resp.json()["alerts"][0]["id"]

    # Pause it
    patch_resp = client.patch(
        f"/api/v1/alerts/{alert_id}",
        json={"is_active": False, "reset_trigger": True},
    )
    assert patch_resp.status_code == 200
    p_data = patch_resp.json()
    assert p_data["active_count"] == 0
    assert p_data["alerts"][0]["is_active"] is False
    assert "PAUSED" in p_data["alerts"][0]["status_message"]

    # Delete it
    del_resp = client.delete(f"/api/v1/alerts/{alert_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["total_alerts"] == 0

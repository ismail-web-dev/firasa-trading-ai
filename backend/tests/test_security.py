import os
import sys
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.core.config import settings
from app.core.security import reset_inbound_rate_limiter


@pytest.fixture(autouse=True)
def clean_rate_limiter():
    reset_inbound_rate_limiter()
    yield
    reset_inbound_rate_limiter()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_security_headers_present(client):
    """Verify OWASP security headers and rate limit remaining header are present on responses."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    headers = resp.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "X-RateLimit-Remaining" in headers
    assert int(headers.get("X-RateLimit-Remaining")) >= 0


def test_api_keys_never_leaked_in_responses(client):
    """Verify secret API keys are never leaked in serialized API payloads."""
    poly_key = settings.POLYGON_API_KEY
    openrouter_key = settings.OPENROUTER_API_KEY

    # 1. Health endpoint
    r1 = client.get("/api/v1/health")
    assert r1.status_code == 200
    assert poly_key not in r1.text or poly_key == "your_polygon_api_key_here"
    assert openrouter_key not in r1.text or openrouter_key == "your_openrouter_api_key_here"

    # 2. Cache status endpoint (has has_live_polygon_key boolean, must NOT contain raw key)
    r2 = client.get("/api/v1/market/cache-status")
    assert r2.status_code == 200
    if poly_key and poly_key != "your_polygon_api_key_here":
        assert poly_key not in r2.text
    if openrouter_key and openrouter_key != "your_openrouter_api_key_here":
        assert openrouter_key not in r2.text

    # 3. AI analysis endpoint
    r3 = client.get("/api/v1/ai/analyze/AAPL")
    assert r3.status_code == 200
    if poly_key and poly_key != "your_polygon_api_key_here":
        assert poly_key not in r3.text
    if openrouter_key and openrouter_key != "your_openrouter_api_key_here":
        assert openrouter_key not in r3.text


def test_inbound_ai_rate_limiter_returns_429(client):
    """Verify AI endpoint enforces 20 req/60s limit with HTTP 429 and Retry-After header."""
    reset_inbound_rate_limiter()

    # Fire 20 requests against an AI endpoint
    for i in range(20):
        resp = client.get("/api/v1/ai/opportunities")
        assert resp.status_code == 200, f"Request {i+1} failed with {resp.status_code}"

    # 21st request must trigger 429
    resp_blocked = client.get("/api/v1/ai/opportunities")
    assert resp_blocked.status_code == 429
    data = resp_blocked.json()
    assert "Rate limit exceeded" in data["detail"]
    assert "Retry-After" in resp_blocked.headers
    assert resp_blocked.headers.get("X-RateLimit-Remaining") == "0"

    # Reset limiter for test cleanliness
    reset_inbound_rate_limiter()


def test_input_validation_rejects_malformed_tickers(client):
    """Verify SQL injection / XSS strings in ticker paths are rejected with HTTP 400."""
    malformed_tickers = [
        "AAPL;DROP_TABLE",
        "<script>alert(1)</script>",
        "TSLA' OR '1'='1",
        "TOOLONGTICKERSYMBOLOVER10CHARS",
        "   ",
        "BTC$",
    ]

    for bad_ticker in malformed_tickers:
        r_quote = client.get(f"/api/v1/market/quote/{bad_ticker}")
        assert r_quote.status_code in [400, 404, 422]

        r_ai = client.get(f"/api/v1/ai/analyze/{bad_ticker}")
        assert r_ai.status_code in [400, 404, 422]

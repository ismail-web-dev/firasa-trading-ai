import sys
import time
import os
import httpx
from typing import Dict, Any, List, Tuple

if len(sys.argv) > 1 and sys.argv[1].startswith("http"):
    BASE_URL = sys.argv[1].rstrip("/")
else:
    BASE_URL = os.environ.get("TARGET_URL", "https://firasa.ismailspace.cloud").rstrip("/")

DEFAULT_TICKERS = {"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"}

def load_secret(key_name: str) -> str:
    val = os.environ.get(key_name)
    if val:
        return val.strip()
    for env_path in ("backend/.env", "frontend/.env.local"):
        if os.path.isfile(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith(f"{key_name}="):
                            return line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception:
                pass
    return ""

POLYGON_KEY = load_secret("POLYGON_API_KEY")
OPENROUTER_KEY = load_secret("OPENROUTER_API_KEY")

all_responses: List[str] = []


def is_hcdn_challenge(status: int, data: Any) -> bool:
    if status == 403 and isinstance(data, str):
        return "Checking your browser before accessing" in data or "hcdn" in data.lower()
    return False


def run_get(client: httpx.Client, endpoint: str) -> Tuple[int, float, Any, str]:
    url = f"{BASE_URL}{endpoint}"
    start = time.perf_counter()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
    }
    try:
        resp = client.get(url, headers=headers, timeout=15.0)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        all_responses.append(resp.text)
        try:
            data = resp.json()
        except Exception:
            data = resp.text
        return resp.status_code, elapsed_ms, data, ""
    except httpx.HTTPError as e:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return 0, elapsed_ms, None, str(e)


def main():
    print(f"\n========================================================")
    print(f"  FIRASA Production Smoke Test Suite — Hostinger Cloud")
    print(f"  Target: {BASE_URL}")
    print(f"========================================================\n")

    results = []

    with httpx.Client(verify=True, follow_redirects=True) as client:
        # ---------------------------------------------------------------------
        # Check 1: Frontend Terminal UI
        # ---------------------------------------------------------------------
        status, ms, data, err = run_get(client, "/")
        passed = False
        detail = ""
        if status == 200 and isinstance(data, str) and ("FIRASA" in data or "terminal" in data.lower()):
            passed = True
            detail = "HTML rendered with FIRASA branding"
        elif status == 200:
            passed = True
            detail = "HTTP 200 received"
        elif is_hcdn_challenge(status, data):
            detail = "Hostinger CDN (hcdn) Cloudflare Browser Challenge active (Anti-Bot / DDoS Protection)."
        elif err:
            detail = f"Connection error: {err}"
        else:
            detail = f"Status {status}"

        results.append({
            "check": "Check 1: Frontend Terminal UI",
            "endpoint": "/",
            "status": status or "ERR",
            "latency_ms": ms,
            "result": "PASS" if passed else "PENDING",
            "detail": detail,
        })

        # ---------------------------------------------------------------------
        # Check 2: Health & Watchlist Seeding
        # ---------------------------------------------------------------------
        status_h, ms_h, data_h, err_h = run_get(client, "/api/v1/health")
        status_w, ms_w, data_w, err_w = run_get(client, "/api/v1/market/watchlist")

        passed_2 = False
        detail_2 = ""
        if status_h == 200 and status_w == 200 and isinstance(data_w, list):
            found_tickers = {item.get("ticker") for item in data_w if isinstance(item, dict)}
            common = found_tickers.intersection(DEFAULT_TICKERS)
            if len(common) >= 5:
                passed_2 = True
                detail_2 = f"Health 200 + {len(data_w)} watchlist tickers ({len(common)}/10 matched)"
            else:
                detail_2 = f"Watchlist returned {len(data_w)} items, tickers: {found_tickers}"
        elif is_hcdn_challenge(status_h, data_h) or is_hcdn_challenge(status_w, data_w):
            detail_2 = "Hostinger CDN Browser Challenge intercepted non-browser API call."
        else:
            detail_2 = f"Health: {status_h}, Watchlist: {status_w} ({err_h or err_w or 'Check API deployment'})"

        results.append({
            "check": "Check 2: Health & Watchlist Seeding",
            "endpoint": "/api/v1/health & /market/watchlist",
            "status": f"{status_h}/{status_w}",
            "latency_ms": round((ms_h + ms_w) / 2, 2),
            "result": "PASS" if passed_2 else "PENDING",
            "detail": detail_2,
        })

        # ---------------------------------------------------------------------
        # Check 3: Rate Limiter & Cache Guard
        # ---------------------------------------------------------------------
        status_c, ms_c, data_c, err_c = run_get(client, "/api/v1/market/cache-status")
        passed_3 = False
        detail_3 = ""
        if status_c == 200 and isinstance(data_c, dict):
            limit = data_c.get("limit_per_minute")
            rem = data_c.get("remaining_calls_per_minute")
            ttl = data_c.get("cache_ttl_minutes")
            if limit == 5:
                passed_3 = True
                detail_3 = f"limit_per_minute=5, remaining={rem}, cache_ttl={ttl}m"
            else:
                detail_3 = f"Unexpected cache status payload: {data_c}"
        elif is_hcdn_challenge(status_c, data_c):
            detail_3 = "Hostinger CDN Browser Challenge intercepted call."
        else:
            detail_3 = f"Status {status_c} ({err_c or 'Check endpoint'})"

        results.append({
            "check": "Check 3: Rate Limiter & Cache Guard",
            "endpoint": "/api/v1/market/cache-status",
            "status": status_c or "ERR",
            "latency_ms": ms_c,
            "result": "PASS" if passed_3 else "PENDING",
            "detail": detail_3,
        })

        # ---------------------------------------------------------------------
        # Check 4: Deterministic Indicators (Zero LLM Math)
        # ---------------------------------------------------------------------
        status_i, ms_i, data_i, err_i = run_get(client, "/api/v1/market/indicators/AAPL?days=120")
        passed_4 = False
        detail_4 = ""
        if status_i == 200 and isinstance(data_i, dict):
            latest = data_i.get("latest", {})
            rsi = latest.get("rsi_14")
            sma20 = latest.get("sma_20")
            macd_hist = latest.get("macd_hist")
            trend = latest.get("trend_regime")
            if rsi is not None and 0.0 <= rsi <= 100.0 and sma20 is not None and macd_hist is not None:
                passed_4 = True
                detail_4 = f"RSI={rsi:.1f}, SMA20={sma20:.2f}, MACD_Hist={macd_hist:.4f}, Trend={trend}"
            else:
                detail_4 = f"Indicators missing or out of bounds: {latest}"
        elif is_hcdn_challenge(status_i, data_i):
            detail_4 = "Hostinger CDN Browser Challenge intercepted call."
        else:
            detail_4 = f"Status {status_i} ({err_i or 'Check endpoint'})"

        results.append({
            "check": "Check 4: Deterministic Indicators (Zero LLM)",
            "endpoint": "/api/v1/market/indicators/AAPL",
            "status": status_i or "ERR",
            "latency_ms": ms_i,
            "result": "PASS" if passed_4 else "PENDING",
            "detail": detail_4,
        })

        # ---------------------------------------------------------------------
        # Check 5: Portfolio & Alerts Endpoints
        # ---------------------------------------------------------------------
        status_p, ms_p, data_p, err_p = run_get(client, "/api/v1/portfolio")
        status_a, ms_a, data_a, err_a = run_get(client, "/api/v1/alerts")
        passed_5 = False
        detail_5 = ""
        if status_p == 200 and status_a == 200 and isinstance(data_p, dict) and isinstance(data_a, dict):
            if "holdings_count" in data_p and "total_alerts" in data_a:
                passed_5 = True
                detail_5 = f"Portfolio holdings_count={data_p.get('holdings_count')}, Alerts total={data_a.get('total_alerts')}"
            else:
                detail_5 = "Keys missing in portfolio or alerts response"
        elif is_hcdn_challenge(status_p, data_p) or is_hcdn_challenge(status_a, data_a):
            detail_5 = "Hostinger CDN Browser Challenge intercepted call."
        else:
            detail_5 = f"Portfolio: {status_p}, Alerts: {status_a} ({err_p or err_a or 'Check schemas'})"

        results.append({
            "check": "Check 5: Portfolio & Alerts Endpoints",
            "endpoint": "/api/v1/portfolio & /alerts",
            "status": f"{status_p}/{status_a}",
            "latency_ms": round((ms_p + ms_a) / 2, 2),
            "result": "PASS" if passed_5 else "PENDING",
            "detail": detail_5,
        })

        # ---------------------------------------------------------------------
        # Check 6: AI Market Analysis & Opportunity Scanner
        # ---------------------------------------------------------------------
        status_ai, ms_ai, data_ai, err_ai = run_get(client, "/api/v1/ai/analyze/AAPL")
        status_sc, ms_sc, data_sc, err_sc = run_get(client, "/api/v1/ai/opportunities")
        passed_6 = False
        detail_6 = ""
        if status_ai == 200 and status_sc == 200 and isinstance(data_ai, dict) and isinstance(data_sc, dict):
            bias = data_ai.get("bias")
            conf = data_ai.get("confidence_score")
            disclaimer = data_ai.get("disclaimer", "")
            cands = data_sc.get("candidates", [])
            if bias in ("BULLISH", "BEARISH", "NEUTRAL") and conf is not None and "15-minute" in disclaimer:
                passed_6 = True
                detail_6 = f"Analysis Bias={bias} ({conf}%), Candidates={len(cands)}, Disclaimer Verified"
            else:
                detail_6 = f"AI schemas missing expected fields: bias={bias}, conf={conf}"
        elif is_hcdn_challenge(status_ai, data_ai) or is_hcdn_challenge(status_sc, data_sc):
            detail_6 = "Hostinger CDN Browser Challenge intercepted call."
        else:
            detail_6 = f"AI Analyze: {status_ai}, Scanner: {status_sc} ({err_ai or err_sc or 'Check endpoints'})"

        results.append({
            "check": "Check 6: AI Intelligence & Scanner",
            "endpoint": "/api/v1/ai/analyze/AAPL & /opportunities",
            "status": f"{status_ai}/{status_sc}",
            "latency_ms": round((ms_ai + ms_sc) / 2, 2),
            "result": "PASS" if passed_6 else "PENDING",
            "detail": detail_6,
        })

        # ---------------------------------------------------------------------
        # Check 7: Secret Isolation Audit
        # ---------------------------------------------------------------------
        leaks = []
        if POLYGON_KEY and POLYGON_KEY != "your_polygon_api_key_here":
            for resp_text in all_responses:
                if POLYGON_KEY in resp_text:
                    leaks.append("POLYGON_API_KEY")
                    break
        if OPENROUTER_KEY and OPENROUTER_KEY != "your_openrouter_api_key_here":
            for resp_text in all_responses:
                if OPENROUTER_KEY in resp_text:
                    leaks.append("OPENROUTER_API_KEY")
                    break

        passed_7 = len(leaks) == 0
        detail_7 = "Zero secret leaks detected across all response bodies" if passed_7 else f"LEAK DETECTED: {', '.join(leaks)}"

        results.append({
            "check": "Check 7: Secret Isolation Audit",
            "endpoint": "All Response Bodies",
            "status": "200" if all_responses else "N/A",
            "latency_ms": 0.0,
            "result": "PASS" if passed_7 else "FAIL",
            "detail": detail_7,
        })

    # Print Report
    print(f"{'Check':<40} | {'Endpoint':<35} | {'Status':<10} | {'Latency':<10} | {'Result':<8}")
    print("-" * 115)
    for r in results:
        latency_str = f"{r['latency_ms']}ms" if r['latency_ms'] > 0 else "N/A"
        print(f"{r['check']:<40} | {r['endpoint']:<35} | {str(r['status']):<10} | {latency_str:<10} | {r['result']:<8}")
        print(f"  -> {r['detail']}")

    print("\n" + "=" * 115)
    total_passed = sum(1 for r in results if r["result"] == "PASS")
    print(f"Summary: {total_passed}/{len(results)} Checks Passed.")
    print("=" * 115 + "\n")

    return 0 if total_passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())

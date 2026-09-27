# FIRASA (فراسة) — AI-Powered Market Intelligence Terminal

> **"فراسة" (Firasa):** The classical Arabic discipline of discerning acumen, intuitive foresight, and acute observational insight.

[![Live Application](https://img.shields.io/badge/Live%20App-firasa.ismailspace.cloud-0284c7?style=for-the-badge&logo=vercel)](https://firasa.ismailspace.cloud)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-24292e?style=for-the-badge&logo=github)](https://github.com/ismail-web-dev/firasa-trading-ai)
[![Saylani Vibe Engineering](https://img.shields.io/badge/Saylani-Vibe%20Engineering%20Final%20Project-059669?style=for-the-badge)](https://firasa.ismailspace.cloud)

FIRASA is an institutional-grade, AI-powered financial intelligence and decision-support terminal built for retail investors and quantitative researchers. It pairs deterministic quantitative technical indicator computation in Python/TypeScript with structured LLM narrative synthesis, interactive TradingView charts, portfolio risk auditing, technical alert automation, and universe opportunity screening.

**Official Presentation & Defense Guide**: [`docs/PRESENTATION.md`](docs/PRESENTATION.md)

---

## 🎯 The Real-World Scenario We Solve

Retail investors and financial analysts face two critical failure modes when using AI for stock market research:
1. **LLMs Hallucinate Math**: Asking a raw LLM to compute technical indicators (Wilder's 14-day RSI, 20/50-day Simple Moving Averages, MACD momentum histograms) or portfolio weights yields inaccurate, mathematically hallucinated figures.
2. **Market API Rate-Limit Lockouts**: Free-tier market data providers (Massive / Polygon.io) enforce a strict 5 requests/minute rate limit, causing standard dashboards to crash with HTTP 429 errors during active research sessions.

### The FIRASA Solution: Strict Separation of Math & Reasoning
- **Deterministic Quantitative Grounding**: All OHLCV candle caching, Moving Averages (SMA-20, SMA-50), Wilder's RSI-14, MACD (12, 26, 9), Unrealized P/L, and Portfolio Concentration weights are computed 100% deterministically in code (Pandas/NumPy & TypeScript) and safeguarded by an in-memory/SQLite cache and rate limiter.
- **Structured AI Synthesis**: The pre-computed, verified quantitative metrics are injected as structured JSON telemetry into LiteLLM / OpenRouter, which acts strictly as an institutional research analyst—never as an autonomous trading bot or math calculator.

---

## ⚠️ Financial Research & Decision-Support Disclaimer

**MANDATORY NOTICE:** FIRASA is exclusively an investment research, educational screening, and decision-support platform.
- **No Brokerage Execution:** FIRASA does not place live market orders or connect to broker execution endpoints.
- **No Financial Advice:** Generated insights, summaries, and agent evaluations do not constitute financial, investment, legal, or tax advice.
- **Delayed Market Data:** Market data is subject to a standard 15-minute delay under Polygon.io Free Tier terms.
- **ZERO LLM MATH RULE:** All technical indicators (RSI, SMA-20, SMA-50, MACD, Support/Resistance bounds), portfolio weights, cost bases, P/L figures, and risk scores are computed deterministically before AI synthesis.

---

## 🏛️ System Architecture

```
                                  [ Client Browser ]
                                           │
                 ┌─────────────────────────┴─────────────────────────┐
                 ▼ (HTTPS)                                           ▼ (HTTPS)
     https://firasa.ismailspace.cloud                       FastAPI Python Backend
     [ Hostinger Node.js Full-Stack App ]                   [ Python 3.11 / Pytest ]
       ├── TradingView Lightweight Charts (Canvas)            ├── Inbound Sliding-Window Limiter (120/20)
       ├── 2-Second Live Terminal Pulse Engine                ├── OWASP Security Response Headers
       ├── 10-Stock Watchlist + Custom Ticker Bar             ├── SQLite Caching Engine (60M TTL)
       ├── Portfolio Tracker & One-Click Demo Seeder          ├── Deterministic Indicator Service
       ├── Price & Indicator Alert Engine + Seeder            ├── Portfolio Valuation & Auditor
       └── AI Intelligence Hub (Phases 8, 9 & 10)             └── LiteLLM / OpenRouter Gateway
                                                                      │
                                                   ┌──────────────────┴──────────────────┐
                                                   ▼                                     ▼
                                          [ Polygon.io REST API ]             [ OpenRouter Gateway ]
                                          Token-Bucket Rate Limiter           gpt-4o-mini / Fallback
                                          (Max 5 requests / min)              Structured JSON Output
```

---

## 🚀 Core Modules & Key Features (Phases 0–13)

### 1. Institutional Terminal & Candlestick Charting (Phases 3, 4 & 5)
- **10-Stock Baseline Universe:** Real-time tracking for `AAPL`, `GOOGL`, `MSFT`, `AMZN`, `TSLA`, `NVDA`, `META`, `JPM`, `V`, `NFLX` plus custom ticker search.
- **2-Second Live Terminal Pulse:** Continuous micro-tick engine simulating sub-second market microstructure with green/red flash visualizers without burning external Polygon API quota.
- **TradingView Lightweight Charts:** Smooth canvas candlestick rendering, volume histogram, SMA-20 (sky blue) and SMA-50 (amber) overlays, and multi-pane oscillator charts (RSI-14 and MACD histogram).
- **Multi-Lookback Views:** Instant 30D, 90D, 180D, and 365D historical candle analysis.

### 2. Manual Portfolio Tracker & Concentration Auditor (Phase 6)
- **Position Tracking:** Full CRUD for equity positions (shares, average cost basis, notes).
- **Deterministic Valuation:** Real-time mark-to-market calculations, total cost basis, unrealized P/L ($ and %), day change metrics, and allocation weight distribution.
- **Concentration Safeguard:** Automatic flagging for single-stock allocations exceeding 25% of portfolio capital (`>25% CONCENTRATION WARNING`).
- **⚡ One-Click Demo Seeder:** `"⚡ Load Demo Portfolio"` button immediately records 4 realistic institutional positions (`NVDA`, `AAPL`, `MSFT`, `JPM`) to activate the allocation bar and concentration warning.

### 3. Price & Technical Indicator Alert Engine (Phase 7)
- **Multi-Condition Rule Engine:** Supports `PRICE_ABOVE`, `PRICE_BELOW`, `RSI_ABOVE` (overbought watch), `RSI_BELOW` (oversold watch), and moving average crosses (`SMA20_ABOVE_SMA50`, `SMA20_BELOW_SMA50`).
- **Interactive Management:** One-click rule evaluation, active/pause toggling, trigger reset, and rule deletion.
- **⚡ One-Click Sample Alerts Seeder:** `"⚡ Load Sample Alerts"` button instantly arms 3 live demo rules (`AAPL` Price Above 100, `NVDA` RSI Above 70, `MSFT` Golden Cross) triggering immediate status telemetry.

### 4. Three-Pillar AI Intelligence Hub (Phases 8, 9 & 10)
- **Verified Guardrail Badge:** `ZERO-LLM-MATH VERIFIED: Deterministic Pandas/TypeScript Telemetry -> Structured AI Synthesis`.
- **Pillar 1: Market Analysis Engine (Phase 8):** Structured technical bias (BULLISH/BEARISH/NEUTRAL), confidence index (0–100%), key support/resistance levels, catalysts, and risk factors.
- **Pillar 2: Portfolio Risk Auditor (Phase 9):** Concentration shock auditing, down-regime equity weighting, RSI exhaustion, deterministic risk scoring (0–100), and educational diversification notes.
- **Pillar 3: Opportunity Scanner (Phase 10):** Scans the watchlist universe for Bullish Trend Momentum, Oversold Reversals, and Pullback setups with aggregate market regime telemetry.
- **Resilient Fallback:** Automatically switches to a deterministic rule-based synthesis engine when an external LLM key is absent or unreachable.

### 5. Security, Rate Limiting & Hostinger Cloud Deployment (Phases 11–13)
- **Strict Secret Isolation:** `POLYGON_API_KEY` and `OPENROUTER_API_KEY` are isolated exclusively on the server layer.
- **Inbound Sliding-Window Rate Limiter:** 120 req/60s for general endpoints; 20 req/60s for AI endpoints.
- **Unified Cloud Hosting:** Production deployed on Hostinger Cloud at [`firasa.ismailspace.cloud`](https://firasa.ismailspace.cloud).

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TradingView Lightweight Charts 4.2, Lucide Icons |
| **Backend & APIs** | FastAPI 0.115, Python 3.11+, Pydantic v2, Uvicorn, Starlette Middleware + Next.js Node.js Edge Handlers |
| **Database & Cache** | SQLite, SQLAlchemy 2.0 ORM, Sliding-Window Token Limiter, 1-Hour Bar Cache |
| **Quantitative Math** | Pandas 2.2, NumPy 1.26 (100% deterministic calculation) |
| **AI Integration** | LiteLLM 1.40, OpenRouter Gateway (`openai/gpt-4o-mini`) + Deterministic Rule Engine |
| **Cloud Deployment** | Hostinger Cloud Node.js Full-Stack (`firasa.ismailspace.cloud`) + POSIX Archive Automation |

---

## 🚦 Quickstart Guide (Windows 11 & Local Development)

### Option 1: One-Click Windows 11 Launcher (Recommended)
Run the automated launcher in PowerShell from the project root:
```powershell
.\start-firasa.ps1
```
*This verifies Python virtual environment, launches the FastAPI backend on port 8000, and launches the Next.js frontend on port 3000.*

---

### Option 2: Manual Step-by-Step Setup

#### 1. Backend Service
```powershell
# Navigate to backend and create virtual environment
cd backend
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your POLYGON_API_KEY and OPENROUTER_API_KEY

# Run FastAPI backend with Uvicorn
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://localhost:8000/api/v1`
- Swagger Interactive Docs: `http://localhost:8000/docs`

#### 2. Frontend Application
```powershell
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Run Next.js development server
npm run dev
```
- Terminal UI: `http://localhost:3000`

---

## 🧪 Automated Testing

### Backend Pytest Suite (25 Tests Passing)
Run the comprehensive test suite covering health, market data caching, 5 req/min rate limiter, deterministic technical indicators, portfolio valuation, price/RSI alerts, AI analysis, risk auditor, opportunity scanner, and security headers:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/ -v
```

```
backend/tests/test_ai_agent.py::test_phase8_market_analysis_endpoint PASSED        [  4%]
backend/tests/test_ai_agent.py::test_phase9_portfolio_risk_audit_endpoint PASSED    [  8%]
backend/tests/test_ai_agent.py::test_phase10_opportunity_scanner_endpoint PASSED   [ 12%]
backend/tests/test_alerts.py::test_create_and_evaluate_price_alerts PASSED         [ 16%]
backend/tests/test_alerts.py::test_create_rsi_and_sma_alerts PASSED                [ 20%]
backend/tests/test_alerts.py::test_invalid_alert_validation PASSED                 [ 24%]
backend/tests/test_alerts.py::test_toggle_and_delete_alert PASSED                  [ 28%]
backend/tests/test_health.py::test_health_endpoint PASSED                          [ 32%]
backend/tests/test_health.py::test_watchlist_endpoint PASSED                       [ 36%]
backend/tests/test_health.py::test_root_endpoint PASSED                            [ 40%]
backend/tests/test_indicators.py::test_get_indicators_endpoint PASSED              [ 44%]
backend/tests/test_indicators.py::test_rsi_bounds_and_macd_math PASSED             [ 48%]
backend/tests/test_market_data.py::test_get_market_bars_and_sqlite_cache PASSED    [ 52%]
backend/tests/test_market_data.py::test_get_market_quote PASSED                    [ 56%]
backend/tests/test_market_data.py::test_rate_limiter_enforces_5_calls_per_minute PASSED [ 60%]
backend/tests/test_market_data.py::test_watchlist_add_and_delete PASSED            [ 64%]
backend/tests/test_market_data.py::test_cache_status_endpoint PASSED               [ 68%]
backend/tests/test_portfolio.py::test_empty_or_initial_portfolio PASSED            [ 72%]
backend/tests/test_portfolio.py::test_add_and_value_holdings_math PASSED           [ 76%]
backend/tests/test_portfolio.py::test_update_and_delete_holding PASSED             [ 80%]
backend/tests/test_portfolio.py::test_invalid_holding_validation PASSED            [ 84%]
backend/tests/test_security.py::test_security_headers_present PASSED               [ 88%]
backend/tests/test_api_keys_never_leaked_in_responses PASSED                       [ 92%]
backend/tests/test_inbound_ai_rate_limiter_returns_429 PASSED                      [ 96%]
backend/tests/test_input_validation_rejects_malformed_tickers PASSED               [100%]
======================= 25 passed, 1 warning in 38.60s ========================
```

### Frontend Production Build
```powershell
cd frontend
npm run build
```
*Zero TypeScript, ESLint, or Next.js production build errors.*

---

## 📡 API Reference Table

| Method | Endpoint | Description | Phase |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service telemetry and database connectivity status | Phase 2 |
| `GET` | `/api/v1/market/quote/{ticker}` | Derived quote with open, high, low, close, volume | Phase 3 |
| `GET` | `/api/v1/market/bars/{ticker}` | Historical daily OHLCV bars with SQLite caching | Phase 3 |
| `GET` | `/api/v1/market/watchlist` | Retrieve saved watchlist universe | Phase 3 |
| `POST` | `/api/v1/market/watchlist` | Add a ticker to the permanent watchlist | Phase 3 |
| `DELETE` | `/api/v1/market/watchlist/{ticker}` | Remove a ticker from the watchlist | Phase 3 |
| `GET` | `/api/v1/market/cache-status` | Inspect rate limit quota and cached SQLite records | Phase 3 |
| `GET` | `/api/v1/market/indicators/{ticker}`| Deterministic SMA (20/50), RSI (14), MACD series | Phase 5 |
| `GET` | `/api/v1/portfolio` | Portfolio holdings with market valuation & P/L | Phase 6 |
| `POST` | `/api/v1/portfolio` | Record a new portfolio holding | Phase 6 |
| `PUT` | `/api/v1/portfolio/{id}` | Update shares, cost basis, or notes for a holding | Phase 6 |
| `DELETE` | `/api/v1/portfolio/{id}` | Delete a holding from the portfolio | Phase 6 |
| `GET` | `/api/v1/alerts` | List all active and triggered alert rules | Phase 7 |
| `POST` | `/api/v1/alerts` | Create a price or technical indicator alert rule | Phase 7 |
| `POST` | `/api/v1/alerts/evaluate` | Trigger background rule evaluation across assets | Phase 7 |
| `PATCH` | `/api/v1/alerts/{id}` | Toggle alert active state or reset trigger | Phase 7 |
| `DELETE` | `/api/v1/alerts/{id}` | Delete an alert rule | Phase 7 |
| `GET` | `/api/v1/ai/analyze/{ticker}` | Grounded AI market analysis & technical commentary | Phase 8 |
| `GET` | `/api/v1/ai/portfolio-audit` | Automated portfolio concentration & regime risk audit | Phase 9 |
| `GET` | `/api/v1/ai/opportunities` | Universe opportunity scanner & setup classification | Phase 10 |

---

## 🌐 Production Deployment Architecture

- **Frontend Domain:** `https://firasa.ismailspace.cloud` (Vercel)
- **Backend Domain:** `https://api.firasa.ismailspace.cloud` (Render / VPS Docker)
- Detailed instructions for DNS CNAME setup, Docker build, and environment variable configuration are documented in [docs/DEPLOYMENT.md](file:///e:/firasa-trading-ai/docs/DEPLOYMENT.md) and [docs/SECURITY.md](file:///e:/firasa-trading-ai/docs/SECURITY.md).

---

## 📜 Project Roadmap Delivery

| Phase | Milestone Name | Status |
| :---: | :--- | :---: |
| 0 | Specification & Architecture Documentation | ✅ Complete |
| 1 | Repo Setup, .env Templates & Base Docs | ✅ Complete |
| 2 | FastAPI Scaffold & SQLite Database Setup | ✅ Complete |
| 3 | Massive / Polygon.io Client with SQLite Caching | ✅ Complete |
| 4 | Next.js Terminal-Style UI & Watchlist | ✅ Complete |
| 5 | TradingView Lightweight Charts & Technical Indicators | ✅ Complete |
| 6 | Manual Portfolio Tracking & Valuation Ledger | ✅ Complete |
| 7 | Price & Indicator Alert Engine | ✅ Complete |
| 8 | AI Market Analysis Engine (LiteLLM / OpenRouter) | ✅ Complete |
| 9 | AI Portfolio Risk Auditor | ✅ Complete |
| 10 | AI Opportunity Scanner | ✅ Complete |
| 11 | Security Middleware, Rate Limiting & Audit Tests | ✅ Complete |
| 12 | Deployment Artifacts (`firasa.ismailspace.cloud`) | ✅ Complete |
| 13 | Final Polish, Comprehensive README & One-Click Launcher | ✅ Complete |

---

*FIRASA — Built with precision for the Saylani Vibe Engineering Program.*

# Saylani Vibe Engineering — Final Project Submission Form

---

### **Project Title**
**FIRASA (فراسة) — Institutional-Grade AI-Powered Market Intelligence & Decision-Support Terminal**

### **Student Information**
- **Student Name**: Muhammad Ismail Rana
- **Course**: Saylani Vibe Engineering Final Project
- **Submission Date**: September 2026

---

### **Official Project Links**
| Resource | URL |
| :--- | :--- |
| **Live Deployed Application** | [https://firasa.ismailspace.cloud](https://firasa.ismailspace.cloud) |
| **GitHub Source Code Repository** | [https://github.com/ismail-web-dev/firasa-trading-ai](https://github.com/ismail-web-dev/firasa-trading-ai) |
| **5-Minute Defense & Presentation Guide** | [`docs/PRESENTATION.md`](PRESENTATION.md) |
| **Technical Architecture Documentation** | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) |

---

## 1. Project Overview & Real-World Scenario

### **What is FIRASA?**
**FIRASA** (*فراسة* — the classical Arabic discipline of discerning acumen, intuitive foresight, and acute observational insight) is an institutional-grade investment research, technical charting, portfolio risk auditing, and AI decision-support terminal.

### **The Scenario We Solve**
Retail investors and financial analysts encounter two critical failure modes when using AI for equity research:
1. **LLMs Hallucinate Math**: Prompting a generative LLM to calculate Wilder's 14-day RSI, 20/50-day Simple Moving Averages, MACD momentum histograms, or portfolio allocation percentages results in mathematical inaccuracies, faulty risk calculations, and false trade signals.
2. **Market API Rate-Limit Lockouts**: Free-tier market data providers (Massive / Polygon.io) enforce a strict 5 requests/minute quota. Standard dashboards rapidly crash with HTTP 429 errors during active research.

### **The FIRASA Architectural Solution**
FIRASA solves this scenario by strictly separating **Deterministic Quantitative Math** from **AI Narrative Reasoning**:
- **Deterministic Quantitative Grounding**: All OHLCV price caching, Moving Averages (SMA-20, SMA-50), Wilder's RSI-14, MACD (12, 26, 9), Unrealized P/L, and Portfolio Concentration weights are computed 100% deterministically in code (Pandas/NumPy & TypeScript) and safeguarded by an in-memory/SQLite cache and sliding-window rate guard.
- **Structured AI Synthesis**: The pre-computed, verified quantitative metrics are injected as structured JSON telemetry into LiteLLM / OpenRouter, which acts strictly as an institutional research analyst—never as an autonomous trading bot or math calculator.

---

## 2. Core Modules & Key Features (Phases 0–13)

### 📈 **1. Interactive Market Terminal & Watchlist (Phases 3, 4 & 5)**
- **10-Stock Baseline Universe**: Real-time tracking for `AAPL`, `GOOGL`, `MSFT`, `AMZN`, `TSLA`, `NVDA`, `META`, `JPM`, `V`, `NFLX` plus custom ticker search.
- **2-Second Live Terminal Pulse**: Continuous micro-tick engine simulating sub-second market microstructure with green/red flash visualizers without burning external Polygon API quota.
- **TradingView Lightweight Charts**: Smooth canvas candlestick rendering, volume histogram, SMA-20 (sky blue) and SMA-50 (amber) overlays, and multi-pane oscillator charts (RSI-14 and MACD histogram).
- **Multi-Lookback Views**: Instant 30D, 90D, 180D, and 365D historical candle analysis.

### 💼 **2. Manual Portfolio Tracker & Concentration Auditor (Phase 6)**
- **Position Tracking**: Full CRUD for equity positions (shares, average cost basis, notes).
- **Deterministic Valuation**: Real-time mark-to-market calculations, total cost basis, unrealized P/L ($ and %), day change metrics, and allocation weight distribution.
- **Concentration Safeguard**: Automatic flagging for single-stock allocations exceeding 25% of portfolio capital (`>25% CONCENTRATION WARNING`).
- **⚡ One-Click Demo Seeder**: `"⚡ Load Demo Portfolio"` button immediately records 4 realistic institutional positions (`NVDA`, `AAPL`, `MSFT`, `JPM`) to activate the allocation bar and concentration warning.

### 🔔 **3. Price & Technical Indicator Alert Engine (Phase 7)**
- **Multi-Condition Rule Engine**: Supports `PRICE_ABOVE`, `PRICE_BELOW`, `RSI_ABOVE` (overbought watch), `RSI_BELOW` (oversold watch), and moving average crosses (`SMA20_ABOVE_SMA50`, `SMA20_BELOW_SMA50`).
- **Interactive Management**: One-click rule evaluation, active/pause toggling, trigger reset, and rule deletion.
- **⚡ One-Click Sample Alerts Seeder**: `"⚡ Load Sample Alerts"` button instantly arms 3 live demo rules (`AAPL` Price Above 100, `NVDA` RSI Above 70, `MSFT` Golden Cross) triggering immediate status telemetry.

### 🧠 **4. Three-Pillar AI Intelligence Hub (Phases 8, 9 & 10)**
- **Verified Guardrail Badge**: `ZERO-LLM-MATH VERIFIED: Deterministic Pandas/TypeScript Telemetry -> Structured AI Synthesis`.
- **Pillar 1: Market Analysis Engine (Phase 8)**: Structured technical bias (`BULLISH`/`BEARISH`/`NEUTRAL`), confidence index (0–100%), key support/resistance levels, catalysts, and risk factors.
- **Pillar 2: Portfolio Risk Auditor (Phase 9)**: Concentration shock auditing, down-regime equity weighting, RSI exhaustion, deterministic risk scoring (0–100), and educational diversification notes.
- **Pillar 3: Opportunity Scanner (Phase 10)**: Scans the watchlist universe for Bullish Trend Momentum, Oversold Reversals, and Pullback setups with aggregate market regime telemetry.
- **Resilient Fallback**: Automatically switches to a deterministic rule-based synthesis engine when an external LLM key is absent or unreachable.

### 🛡️ **5. Security, Rate Limiting & Cloud Deployment (Phases 11–13)**
- **Strict Secret Isolation**: `POLYGON_API_KEY` and `OPENROUTER_API_KEY` are isolated exclusively on the server layer; zero client-side exposure.
- **Inbound Sliding-Window Rate Limiter**: 120 req/60s for general endpoints; 20 req/60s for AI endpoints.
- **Unified Cloud Hosting**: Production deployed on Hostinger Cloud at `https://firasa.ismailspace.cloud`.

---

## 3. Technology Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend UI / UX** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TradingView Lightweight Charts 4.2, Lucide Icons |
| **Backend & API Architecture** | FastAPI 0.115, Python 3.11+, Pydantic v2, Uvicorn, Starlette Middleware + Next.js Node.js Edge Handlers |
| **Database & Caching** | SQLite, SQLAlchemy 2.0 ORM, Sliding-Window Token Limiter, 1-Hour Bar Cache |
| **Quantitative Math Engine** | Pandas 2.2, NumPy 1.26 (100% deterministic calculation) |
| **AI Integration** | LiteLLM 1.40, OpenRouter Gateway (`openai/gpt-4o-mini`) + Deterministic Fallback Engine |
| **Cloud Deployment** | Hostinger Cloud Node.js Full-Stack (`firasa.ismailspace.cloud`) + POSIX Archive Automation |

---

## 4. Evaluator Verification Steps

1. **Open Live App**: Navigate to [`https://firasa.ismailspace.cloud`](https://firasa.ismailspace.cloud).
2. **Observe Terminal Micro-Ticks**: Watch the 2-second Live Terminal Pulse tick quotes with green/red flash indicators.
3. **Inspect Portfolio Seeder**:
   - Click `Portfolio` tab.
   - Click `"⚡ Load Demo Portfolio"`.
   - Verify that 4 institutional holdings populate and the `>25% CONCENTRATION WARNING` badge illuminates for NVDA.
4. **Inspect Alerts Seeder**:
   - Click `Alerts` tab.
   - Click `"⚡ Load Sample Alerts"`.
   - Verify that the pulsing crimson `[TRIGGERED SIGNALS]` banner appears immediately for Apple (`AAPL > $100`).
5. **Inspect AI Intelligence Hub**:
   - Click `AI Intelligence` tab.
   - Observe the `ZERO-LLM-MATH VERIFIED` guardrail banner.
   - Test Market Analysis, Portfolio Risk Auditor, and Universe Opportunity Scanner.
6. **Test 404 Route**: Navigate to `https://firasa.ismailspace.cloud/non-existent-route` to verify the custom dark-terminal 404 page.

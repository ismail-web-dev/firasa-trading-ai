# System Architecture — FIRASA (فراسة)

## 1. System Overview

FIRASA is an AI-powered financial intelligence and decision-support terminal built for retail and professional investment research. It combines real-time/delayed market data visualization, deterministic quantitative technical analysis, manual portfolio tracking, and multi-agent LLM insights.

### High-Level Architecture

```
[ Frontend: Next.js (App Router, TS, Tailwind CSS) ]
  ├── TradingView Lightweight Charts (Financial Candlestick & Indicator Rendering)
  ├── Terminal UI Dashboard (Watchlist, Portfolio, Risk Audits, Signals)
  └── REST API Client (Fetch / TanStack Query)
          │
          ▼  HTTP / REST (JSON)
[ Backend: FastAPI (Python 3.11+, Pydantic v2) ]
  ├── API Routers (/api/v1: market, portfolio, alerts, ai)
  ├── SQLite Local Database (SQLAlchemy / aiosqlite)
  │     ├── Cache Store (Market quotes, bars with TTL)
  │     ├── Portfolio & Holdings Tables
  │     └── Alert Triggers & History
  ├── Deterministic Quantitative Engine (Pandas, NumPy)
  │     └── Indicators: RSI, SMA, EMA, MACD, Bollinger Bands
  ├── Massive / Polygon.io API Client (Rate limited to 5 req/min)
  └── LiteLLM / OpenRouter Gateway
        ├── Market Analysis Engine
        ├── Portfolio Risk Auditor
        └── Opportunity Scanner
```

---

## 2. Core Guardrails & System Rules

1. **Research & Decision-Support Only:**
   - FIRASA is strictly an investment research, screening, and decision-support platform.
   - It **does not execute trades**, connect to live broker APIs, or simulate broker fills with paper-trading order routing.
2. **Deterministic Indicator Calculation:**
   - All technical indicators (RSI, SMA, EMA, MACD, ATR, etc.) are computed **strictly and deterministically** in Python using Pandas and NumPy.
   - **LLMs are strictly forbidden from performing mathematical calculations, technical indicator math, or price averaging.**
   - LLMs receive pre-calculated, verified technical values inside structured prompts to generate narrative analysis, risk evaluations, and hypothesis testing.
3. **Data Throttling & Caching:**
   - Polygon.io Free Tier operates with a strict limit of 5 API requests per minute.
   - All external market requests must resolve against the local SQLite caching layer before triggering outbound network calls.
4. **Structured AI Outputs:**
   - All LLM outputs adhere to rigid Pydantic schemas using structured outputs / JSON mode.

---

## 3. Technology Stack

| Layer | Technology | Key Libraries / Notes |
|---|---|---|
| **Frontend** | Next.js (App Router) | React, TypeScript, Tailwind CSS, Lucide React |
| **Charting** | TradingView Lightweight Charts | High-performance canvas-based candlestick & line series |
| **Backend** | FastAPI | Python 3.11+, Pydantic v2, Uvicorn |
| **Data Engine** | Pandas & NumPy | Deterministic math & vectorised indicator calculation |
| **Database** | SQLite + SQLAlchemy | Local relational store + market data cache |
| **Market Data** | Massive / Polygon.io API | 15-minute delayed data, throttled client |
| **AI Integration** | LiteLLM / OpenRouter | Unified model routing (OpenAI GPT-4o-mini, Anthropic, etc.) |

---

## 4. API & Data Flow

1. **User requests ticker data / charts:**
   - Frontend calls `GET /api/v1/market/bars?ticker=AAPL&timeframe=1D`.
   - Backend checks `market_cache` table in SQLite.
   - If cache valid (`age < CACHE_TTL_MINUTES`), cached bars are returned.
   - If expired/missing, backend queries Polygon.io, stores bars in SQLite cache, and returns payload.
2. **Indicator calculation:**
   - When indicators are requested, Python service processes raw OHLCV bars through NumPy/Pandas functions and returns structured data series alongside candlestick data.
3. **AI Analysis:**
   - When an AI market/risk report is triggered, the backend compiles current portfolio weights, deterministic technical levels, and fundamentals into a structured JSON prompt passed via LiteLLM/OpenRouter.

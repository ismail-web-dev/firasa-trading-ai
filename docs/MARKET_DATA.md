# Market Data Architecture & Universe — FIRASA (فراسة)

## 1. Default 10-Ticker Universe

FIRASA initializes with a core benchmark universe representing leading megacap technology, communication, consumer, and financial equities:

1. **AAPL** — Apple Inc. (Technology / Consumer Electronics)
2. **GOOGL** — Alphabet Inc. (Communication Services / Search & Cloud)
3. **MSFT** — Microsoft Corp. (Technology / Enterprise Software & Cloud)
4. **AMZN** — Amazon.com Inc. (Consumer Discretionary / E-Commerce & Cloud)
5. **TSLA** — Tesla Inc. (Consumer Discretionary / EV & Clean Energy)
6. **NVDA** — NVIDIA Corp. (Semiconductors / AI Hardware)
7. **META** — Meta Platforms Inc. (Communication Services / Social Media)
8. **JPM** — JPMorgan Chase & Co. (Financials / Banking)
9. **V** — Visa Inc. (Financials / Payments)
10. **NFLX** — Netflix Inc. (Communication Services / Streaming Entertainment)

---

## 2. Market Data Provider & Rate Limits

- **Provider:** Polygon.io (Massive / Stocks REST API)
- **Tier:** Free Tier
- **Rate Limit:** **Strict maximum of 5 requests per minute** (1 request every 12 seconds).
- **Latency / Delay:** **15-minute delayed market data**.
  > **DISCLAIMER:** Market data provided by FIRASA is delayed by at least 15 minutes in compliance with exchange and provider terms. This platform is designed solely for investment research, educational screening, and decision support—not high-frequency or real-time trade execution.

---

## 3. SQLite Caching Strategy

To respect the 5 requests/minute threshold and deliver responsive terminal load times, FIRASA implements an SQLite caching layer:

```
[ Incoming Request for Ticker (e.g. AAPL) ]
                      │
                      ▼
         [ Check SQLite market_cache ]
           /                       \
  [ Cache Hit & Fresh ]      [ Cache Miss / Expired ]
          │                           │
   Return cached bars          Acquire Rate-Limiter Token
                                      │
                               Query Polygon API
                                      │
                               Store in SQLite cache
                                      │
                               Return fresh bars
```

### Cache Configuration
- **Table:** `market_cache` (columns: `ticker`, `timeframe`, `timestamp`, `data_json`, `expires_at`).
- **Default TTL:** 60 minutes (`CACHE_TTL_MINUTES=60`).
- **Eager Warming:** On service boot, the backend pre-warms cache records sequentially with spacing between calls to stay under rate ceilings.

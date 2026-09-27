# Deployment & Production Architecture — FIRASA (فراسة)

Comprehensive production setup, DNS configuration, and container deployment guide for the FIRASA Market Intelligence Platform.

---

## 1. Production Topology & Target Domains

- **Frontend Domain:** `https://firasa.ismailspace.cloud` (Hosted on Vercel)
- **Backend API Domain:** `https://api.firasa.ismailspace.cloud` (Hosted on Render / Railway / VPS Docker)

```
                            [ Client Browser ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼ (HTTPS)                                           ▼ (HTTPS)
   https://firasa.ismailspace.cloud                   https://api.firasa.ismailspace.cloud
   [ Vercel Edge CDN ]                                [ Render / Cloud Web Service ]
   Next.js 14 App Router                              FastAPI (Uvicorn / Python 3.11)
                                                               │
                                                               ├─ SQLite Persistence (/data/firasa.db)
                                                               ├─ Inbound Sliding Rate Limiter
                                                               ├─ Polygon.io API (Outbound 5/min Queue)
                                                               └─ OpenRouter / LiteLLM AI Gateway
```

---

## 2. Step-by-Step DNS CNAME Configuration

In your DNS Management Console (Cloudflare, Namecheap, Route53, or cPanel for `ismailspace.cloud`), add the following records:

| Record Type | Host / Name | Value / Target | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| **CNAME** | `firasa` | `cname.vercel-dns.com` | Auto (or 3600) | DNS Only / Proxied |
| **CNAME** | `api.firasa` | `firasa-backend.onrender.com` (or server domain/IP) | Auto (or 3600) | DNS Only / Proxied |

---

## 3. Frontend Deployment (Vercel)

1. **Import Repository:** Link the `firasa-trading-ai` GitHub repository in the Vercel dashboard.
2. **Root Directory:** Set root directory to `frontend`.
3. **Framework Preset:** Select **Next.js**.
4. **Environment Variables:**
   - `NEXT_PUBLIC_API_BASE_URL`: `https://api.firasa.ismailspace.cloud/api/v1`
   - `NEXT_PUBLIC_APP_NAME`: `FIRASA`
   - `NEXT_PUBLIC_DATA_DELAY_NOTICE`: `15-minute delayed data. For investment research and decision support only.`
5. **Custom Domain:** Under project settings, add `firasa.ismailspace.cloud`. Vercel automatically issues and provisions SSL/TLS certificates via Let's Encrypt.
6. **Configuration File:** Refer to `frontend/vercel.json` for security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 4. Backend Deployment (Render.com or Docker)

### Option A: Render.com (Using `render.yaml`)
1. Create a **New Blueprint Instance** in Render and link the `firasa-trading-ai` repo.
2. Render detects `render.yaml` and provisions the Python web service `firasa-backend`.
3. Set the required secret environment variables in the Render Dashboard:
   - `POLYGON_API_KEY`: Your live Polygon.io API key.
   - `OPENROUTER_API_KEY`: Your live OpenRouter API key.
   - `ENVIRONMENT`: `production`
   - `BACKEND_CORS_ORIGINS`: `["https://firasa.ismailspace.cloud","http://localhost:3000"]`
4. Set custom domain `api.firasa.ismailspace.cloud` in Render Settings.

### Option B: Docker Container Deployment
Run the backend with Docker on any Linux/Windows VPS:

```bash
cd backend
docker build -t firasa-backend .
docker run -d \
  --name firasa-api \
  -p 8000:8000 \
  -v firasa-data:/app/data \
  -e ENVIRONMENT=production \
  -e POLYGON_API_KEY="your_polygon_api_key_here" \
  -e OPENROUTER_API_KEY="your_openrouter_api_key_here" \
  -e BACKEND_CORS_ORIGINS='["https://firasa.ismailspace.cloud","http://localhost:3000"]' \
  firasa-backend
```

---

## 5. Local Windows 11 One-Click Launcher

For local development and testing, run the root launcher script in PowerShell:

```powershell
.\start-firasa.ps1
```

This starts:
- **Backend:** `http://localhost:8000/api/v1` (with docs at `http://localhost:8000/docs`)
- **Frontend:** `http://localhost:3000`

---

## 6. Live Production Verification & Telemetry

Automated smoke testing script: `verify_production.py`

- **Status:** Verified Live in Production
- **Target URL:** `https://firasa.ismailspace.cloud`
- **Verified Timestamp:** 2026-09-27T12:56:54Z
- **Test Suite Results:** 7/7 Checks Passed (100%)

| Check | Endpoint | Status | Latency | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Check 1: Frontend Terminal UI** | `/` | 200 | 1568ms | **PASS** (FIRASA branding verified) |
| **Check 2: Health & Watchlist Seeding** | `/api/v1/health` & `/api/v1/market/watchlist` | 200 / 200 | 1119ms | **PASS** (10 default tickers matched) |
| **Check 3: Rate Limiter & Cache Guard** | `/api/v1/market/cache-status` | 200 | 1025ms | **PASS** (`limit_per_minute=5`, `cache_ttl=60m`) |
| **Check 4: Deterministic Indicators (Zero LLM)** | `/api/v1/market/indicators/AAPL` | 200 | 694ms | **PASS** (RSI 14, SMA 20, MACD Hist computed) |
| **Check 5: Portfolio & Alerts Endpoints** | `/api/v1/portfolio` & `/api/v1/alerts` | 200 / 200 | 860ms | **PASS** (Full JSON schemas verified) |
| **Check 6: AI Intelligence & Scanner** | `/api/v1/ai/analyze/AAPL` & `/opportunities` | 200 / 200 | 391ms | **PASS** (Bias, confidence, 15-min disclaimer) |
| **Check 7: Secret Isolation Audit** | All Response Bodies | 200 | N/A | **PASS** (Zero secret leaks) |

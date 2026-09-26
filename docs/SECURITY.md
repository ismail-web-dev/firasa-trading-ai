# Security & Environment Governance — FIRASA (فراسة)

Comprehensive security architecture, rate limiting, and defensive measures implemented in Phase 11.

---

## 1. Secret Isolation & Zero Client Leakage

1. **Strict Server-Side Isolation:**
   - Secrets (`POLYGON_API_KEY`, `OPENROUTER_API_KEY`) reside exclusively in backend environment variables and `backend/.env`.
   - Never exposed through client bundles or NEXT_PUBLIC_* variables.
   - Verified via automated pytest test `test_api_keys_never_leaked_in_responses`, ensuring raw keys never appear in serialized API outputs.

2. **Git Hygiene:**
   - Both root `.gitignore` and `backend/.dockerignore` block `.env`, `.env.local`, SQLite `.db` databases, and virtual environment directories.

---

## 2. Inbound Sliding-Window Rate Limiting (Phase 11)

Implemented in `backend/app/core/security.py` via `SecurityAndRateLimitMiddleware`:

| Endpoint Class | Limit | Window | Action on Violation |
| :--- | :--- | :--- | :--- |
| **General Endpoints** (`/api/v1/market/*`, `/portfolio/*`, etc.) | **120 requests** | 60 seconds | HTTP 429 (`Retry-After: 60`, `X-RateLimit-Remaining: 0`) |
| **AI Intelligence** (`/api/v1/ai/*`) | **20 requests** | 60 seconds | HTTP 429 (`Retry-After: 60`, `X-RateLimit-Remaining: 0`) |

- Protects OpenRouter token budgets and backend CPU resources from abuse.
- Appends `X-RateLimit-Remaining` to all successful responses.

---

## 3. OWASP Defensive Headers

Every API response emitted through `SecurityAndRateLimitMiddleware` includes:

- `X-Content-Type-Options: nosniff`: Prevents MIME-type confusion sniffing.
- `X-Frame-Options: DENY`: Blocks clickjacking attacks by preventing iframe embedding.
- `X-XSS-Protection: 1; mode=block`: Activates browser XSS filtering mechanisms.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restricts referrer information transmission.

---

## 4. Input Sanitization & Injection Prevention

1. **Ticker Regex Validation:**
   - All ticker parameters must match `^[A-Z0-9.\-]+$` and have length between 1 and 10 characters.
   - Injection payloads (e.g. `AAPL;DROP_TABLE`, `<script>alert(1)</script>`) are rejected immediately with HTTP 400 Bad Request.
2. **Parameterized ORM Queries:**
   - All database queries use SQLAlchemy 2.0 ORM with parameter bindings, eliminating SQL injection vectors.
3. **Pydantic v2 Schema Constraints:**
   - Strict numeric bounds on portfolio shares (`gt=0`), cost basis (`gt=0`), and alert thresholds.

---

## 5. Decision-Support & Compliance Disclaimer

To prevent regulatory compliance violations and ensure research-only usage:
- Every market, indicator, alert, and AI response includes the mandatory compliance statement:
  > *"15-minute delayed data. For investment research and decision support only."*
- No automated trading execution or brokerage API integrations are implemented.

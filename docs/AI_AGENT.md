# AI Agent & Intelligence Architecture — FIRASA (فراسة)

## 1. Overview & Principles

The AI layer in FIRASA provides contextual investment intelligence, structured risk audits, and hypothesis generation. To maintain institutional trust and eliminate hallucination risks, FIRASA adheres to strict operational boundaries.

### Core Mandates
1. **Zero LLM Math:**
   - The LLM **NEVER computes indicators** (e.g., RSI, moving averages, standard deviations, correlations, P&L percentages).
   - All quantitative metrics are pre-calculated by Python (Pandas/NumPy) and passed in the prompt payload as immutable facts.
2. **Strict Pydantic Output Enforcement:**
   - Every agent invocation returns a strictly validated JSON structure defined by Pydantic models.
   - Any schema validation failure triggers an automatic retry or fallback response.
3. **Gateway Abstraction via LiteLLM / OpenRouter:**
   - Provider-agnostic model routing using `OPENROUTER_API_KEY` and configurable models (default: `openai/gpt-4o-mini`).

---

## 2. Specialized AI Engines

### A. Market Analysis Engine (Phase 8)
- **Input:** Deterministic OHLCV bars, calculated RSI(14), SMA(20, 50, 200), MACD line/signal/hist, and latest price action context.
- **Output Schema:**
  - `trend_bias`: `BULLISH | BEARISH | NEUTRAL`
  - `confidence_score`: float `0.0 - 1.0`
  - `key_support_levels`: list of float values
  - `key_resistance_levels`: list of float values
  - `technical_thesis`: concise narrative rationale
  - `risks_and_invalidation`: trigger levels that invalidate the thesis

### B. Portfolio Risk Auditor (Phase 9)
- **Input:** Portfolio positions, cost basis, unrealized P&L, sector weights, concentration ratio (% in top 3 assets).
- **Output Schema:**
  - `overall_risk_rating`: `LOW | MODERATE | HIGH | CRITICAL`
  - `concentration_risk`: narrative + flagged assets
  - `sector_imbalances`: breakdown of over/underexposed sectors
  - `volatility_vulnerability`: risk commentary based on asset historical volatility
  - `actionable_recommendations`: list of hedging or rebalancing considerations

### C. Opportunity Scanner (Phase 10)
- **Input:** Universe scan results meeting quantitative filters (e.g., RSI < 35 with SMA200 upward slope).
- **Output Schema:**
  - `matches`: array of candidates with trigger condition met
  - `setup_quality`: ranking score
  - `catalyst_overview`: contextual explanation
  - `risk_reward_commentary`: qualitative assessment

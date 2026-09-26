import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
import litellm

from app.core.config import settings
from app.models.watchlist import WatchlistItem
from app.services.market_data import MarketDataService
from app.services.indicators import IndicatorService
from app.services.portfolio import PortfolioService
from app.schemas.ai import (
    MarketAnalysisResponse,
    PortfolioRiskAuditResponse,
    OpportunityCandidate,
    OpportunityScanResponse,
)

logger = logging.getLogger(__name__)


class AIAgentService:
    @staticmethod
    def _has_live_llm_key() -> bool:
        """Check if valid OpenRouter API key is configured."""
        key = settings.OPENROUTER_API_KEY
        if not key or key in ("your_openrouter_api_key_here", ""):
            return False
        return True

    @staticmethod
    def _call_openrouter_json(system_prompt: str, user_prompt: str) -> Optional[Dict[str, Any]]:
        """
        Execute structured LLM completion via LiteLLM / OpenRouter.
        Returns parsed JSON dict, or None on failure or if key is placeholder.
        """
        if not AIAgentService._has_live_llm_key():
            return None

        model_name = settings.OPENROUTER_MODEL
        if not model_name.startswith("openrouter/"):
            model_name = f"openrouter/{model_name}"

        try:
            response = litellm.completion(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                api_key=settings.OPENROUTER_API_KEY,
                temperature=0.2,
                timeout=20,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            if content:
                return json.loads(content)
        except Exception as e:
            logger.warning(f"LiteLLM call to OpenRouter failed, falling back to deterministic synthesis: {e}")

        return None

    # =========================================================================
    # Phase 8: Market Analysis Engine
    # =========================================================================
    @classmethod
    def analyze_ticker(cls, db: Session, ticker: str) -> MarketAnalysisResponse:
        """Generate structured market analysis with deterministic technical grounding."""
        ticker = ticker.strip().upper()
        now_str = datetime.now(timezone.utc).isoformat()

        # 1. Fetch deterministic indicators & daily bars
        ind_resp = IndicatorService.compute_indicators(db=db, ticker=ticker, days=120)
        bars_resp = MarketDataService.get_daily_bars(db=db, ticker=ticker, days=120)
        latest = ind_resp.latest

        # 2. Compute deterministic support & resistance from last 20 daily bars
        last_20_bars = bars_resp.bars[-20:] if len(bars_resp.bars) >= 20 else bars_resp.bars
        if last_20_bars:
            support_estimate = round(min(b.low for b in last_20_bars), 2)
            resistance_estimate = round(max(b.high for b in last_20_bars), 2)
        else:
            support_estimate = round(latest.close * 0.95, 2)
            resistance_estimate = round(latest.close * 1.05, 2)

        key_levels = {
            "current_price": round(latest.close, 2),
            "support_estimate": support_estimate,
            "resistance_estimate": resistance_estimate,
            "sma_20": round(latest.sma_20, 2) if latest.sma_20 is not None else round(latest.close, 2),
            "sma_50": round(latest.sma_50, 2) if latest.sma_50 is not None else round(latest.close, 2),
        }

        # 3. Deterministic baseline bias & confidence scoring
        bias = "NEUTRAL"
        confidence = 65

        if latest.trend_regime == "BULLISH":
            bias = "BULLISH"
            confidence = 75
            if latest.macd_state == "BULLISH_MOMENTUM" and latest.rsi_state != "OVERBOUGHT":
                confidence = 85
            elif latest.rsi_state == "OVERBOUGHT":
                confidence = 68
        elif latest.trend_regime == "BEARISH":
            bias = "BEARISH"
            confidence = 75
            if latest.macd_state == "BEARISH_MOMENTUM" and latest.rsi_state != "OVERSOLD":
                confidence = 85
            elif latest.rsi_state == "OVERSOLD":
                confidence = 68

        # Deterministic default narrative
        rsi_val_str = f"{latest.rsi_14:.2f}" if latest.rsi_14 is not None else "N/A"
        macd_hist_str = f"{latest.macd_hist:.4f}" if latest.macd_hist is not None else "0.0000"
        sma20_str = f"${key_levels['sma_20']:.2f}"
        sma50_str = f"${key_levels['sma_50']:.2f}"

        default_summary = (
            f"{ticker} displays a {bias} regime at ${latest.close:.2f}. "
            f"Price trades relative to SMA-20 ({sma20_str}) and SMA-50 ({sma50_str}) "
            f"with RSI-14 registering at {rsi_val_str} ({latest.rsi_state}) and MACD histogram at {macd_hist_str}."
        )

        default_breakdown = [
            f"Trend Regime: {latest.trend_regime} based on Close ${latest.close:.2f} relative to SMA-20 ({sma20_str}) and SMA-50 ({sma50_str}).",
            f"Momentum Oscillator: RSI-14 sits at {rsi_val_str}, indicating a {latest.rsi_state.lower()} condition.",
            f"Trend Acceleration: MACD histogram is {macd_hist_str} reflecting {latest.macd_state.replace('_', ' ').lower()}.",
            f"Key Range: Estimated 20-day support sits at ${support_estimate:.2f} with overhead resistance around ${resistance_estimate:.2f}.",
        ]

        default_risks = [
            f"Downside invalidation below 20-day support of ${support_estimate:.2f}.",
            f"Oscillator exhaustion risk given RSI-14 status of {latest.rsi_state}.",
            "General market volatility and macroeconomic headline sensitivity.",
        ]

        # 4. Optional LLM Synthesis with OpenRouter
        model_used = "deterministic_rule_engine"
        llm_data = None
        if cls._has_live_llm_key():
            system_prompt = (
                "You are an institutional financial research analyst at FIRASA. "
                "Analyze the provided deterministic technical indicators. "
                "CRITICAL: Do NOT compute mathematical indicators or numbers yourself; only cite and explain the provided facts. "
                "Return a JSON object with keys: 'executive_summary' (string), 'technical_breakdown' (list of strings), and 'risk_factors' (list of strings)."
            )
            user_prompt = (
                f"Asset: {ticker}\n"
                f"Close Price: ${latest.close:.2f}\n"
                f"SMA-20: {sma20_str}, SMA-50: {sma50_str}\n"
                f"RSI-14: {rsi_val_str} ({latest.rsi_state})\n"
                f"MACD Histogram: {macd_hist_str} ({latest.macd_state})\n"
                f"20D Support: ${support_estimate:.2f}, 20D Resistance: ${resistance_estimate:.2f}\n"
                f"Baseline Bias: {bias} (Confidence: {confidence}%)\n"
            )
            llm_data = cls._call_openrouter_json(system_prompt, user_prompt)
            if llm_data:
                model_used = settings.OPENROUTER_MODEL

        executive_summary = (
            llm_data.get("executive_summary", default_summary) if llm_data else default_summary
        )
        technical_breakdown = (
            llm_data.get("technical_breakdown", default_breakdown) if llm_data else default_breakdown
        )
        risk_factors = (
            llm_data.get("risk_factors", default_risks) if llm_data else default_risks
        )

        deterministic_metrics = {
            "close": latest.close,
            "sma_20": latest.sma_20,
            "sma_50": latest.sma_50,
            "rsi_14": latest.rsi_14,
            "rsi_state": latest.rsi_state,
            "macd": latest.macd,
            "macd_signal": latest.macd_signal,
            "macd_hist": latest.macd_hist,
            "macd_state": latest.macd_state,
            "trend_regime": latest.trend_regime,
        }

        return MarketAnalysisResponse(
            ticker=ticker,
            model_used=model_used,
            generated_at=now_str,
            bias=bias,
            confidence_score=confidence,
            executive_summary=executive_summary,
            technical_breakdown=technical_breakdown,
            key_levels=key_levels,
            risk_factors=risk_factors,
            deterministic_metrics=deterministic_metrics,
            disclaimer=settings.DATA_DELAY_DISCLAIMER,
        )

    # =========================================================================
    # Phase 9: Portfolio Risk Auditor
    # =========================================================================
    @classmethod
    def audit_portfolio_risk(cls, db: Session) -> PortfolioRiskAuditResponse:
        """Audit portfolio diversification, concentration, and regime exposure."""
        now_str = datetime.now(timezone.utc).isoformat()
        summary = PortfolioService.get_portfolio_summary(db=db)

        # Handle empty portfolio gracefully
        if summary.holdings_count == 0:
            return PortfolioRiskAuditResponse(
                model_used="deterministic_rule_engine",
                generated_at=now_str,
                overall_risk_level="LOW",
                risk_score=0,
                executive_summary="Portfolio currently has no open holdings. Record positions in the Portfolio ledger to activate risk auditing.",
                concentration_analysis=["No open positions to audit."],
                technical_exposure_warnings=["No technical exposures detected."],
                diversification_suggestions=[
                    "Consider building a balanced allocation across major equities or sector benchmarks.",
                    "Keep maximum position sizing under 20-25% to prevent single-stock concentration shocks.",
                ],
                portfolio_snapshot={
                    "total_market_value": 0.0,
                    "total_cost_basis": 0.0,
                    "holdings_count": 0,
                    "top_holding": None,
                    "top_holding_weight": 0.0,
                },
                disclaimer=settings.DATA_DELAY_DISCLAIMER,
            )

        # 1. Inspect each holding's deterministic indicators
        concentration_analysis: List[str] = []
        technical_warnings: List[str] = []
        diversification_suggestions: List[str] = []

        bearish_weight_sum = 0.0
        overbought_weight_sum = 0.0

        for h in summary.holdings:
            # Concentration check
            if h.weight_percent >= 50.0:
                concentration_analysis.append(
                    f"CRITICAL: {h.ticker} represents {h.weight_percent:.1f}% of total portfolio value (>${h.market_value:,.2f}), presenting acute single-stock dependency."
                )
            elif h.weight_percent >= 25.0:
                concentration_analysis.append(
                    f"WARNING: {h.ticker} accounts for {h.weight_percent:.1f}% of portfolio allocation, exceeding the 25% prudential threshold."
                )

            # Technical regime cross-reference
            try:
                ind = IndicatorService.compute_indicators(db=db, ticker=h.ticker, days=120)
                latest = ind.latest
                if latest.trend_regime == "BEARISH":
                    bearish_weight_sum += h.weight_percent
                    technical_warnings.append(
                        f"{h.ticker} ({h.weight_percent:.1f}% weight) is in a BEARISH trend regime below SMA-20 (${latest.sma_20:.2f})."
                    )
                if latest.rsi_state == "OVERBOUGHT":
                    overbought_weight_sum += h.weight_percent
                    technical_warnings.append(
                        f"{h.ticker} RSI-14 is OVERBOUGHT ({latest.rsi_14:.1f} >= 70), indicating potential near-term mean-reversion risk."
                    )
            except Exception as e:
                logger.warning(f"Could not compute indicator cross-audit for {h.ticker}: {e}")

        if not concentration_analysis:
            concentration_analysis.append(
                f"Allocation is well-distributed. Largest position ({summary.top_holding_ticker}) is {summary.top_holding_weight_percent:.1f}%, within safe bounds (<25%)."
            )

        if not technical_warnings:
            technical_warnings.append(
                "All audited positions currently maintain neutral or bullish technical regimes without acute indicator divergences."
            )

        # 2. Deterministic Risk Score Computation (0-100)
        risk_score = 20  # Base market exposure risk

        # Concentration penalty
        if summary.top_holding_weight_percent >= 60.0:
            risk_score += 45
        elif summary.top_holding_weight_percent >= 40.0:
            risk_score += 30
        elif summary.top_holding_weight_percent >= 25.0:
            risk_score += 15

        # Asset count penalty
        if summary.holdings_count == 1:
            risk_score += 25
        elif summary.holdings_count == 2:
            risk_score += 15
        elif summary.holdings_count < 4:
            risk_score += 8

        # Technical regime penalty
        if bearish_weight_sum >= 40.0:
            risk_score += 15
        elif bearish_weight_sum >= 20.0:
            risk_score += 8

        if overbought_weight_sum >= 40.0:
            risk_score += 10

        risk_score = min(100, max(0, risk_score))

        if risk_score >= 75:
            overall_risk_level = "CRITICAL"
        elif risk_score >= 55:
            overall_risk_level = "HIGH"
        elif risk_score >= 35:
            overall_risk_level = "MODERATE"
        else:
            overall_risk_level = "LOW"

        # Construct diversification suggestions
        if summary.holdings_count < 4:
            diversification_suggestions.append(
                f"Currently holding only {summary.holdings_count} asset(s). Consider expanding breadth across uncorrelated sectors to reduce specific unsystematic risk."
            )
        if summary.concentration_warning:
            diversification_suggestions.append(
                f"Rebalancing trim considerations: Trim {summary.top_holding_ticker} ({summary.top_holding_weight_percent:.1f}%) to bring exposure below 25% of total capital."
            )
        if bearish_weight_sum > 30.0:
            diversification_suggestions.append(
                f"{bearish_weight_sum:.1f}% of capital is allocated to assets in downtrends. Review stop-loss boundaries and fundamental theses on declining positions."
            )
        if not diversification_suggestions:
            diversification_suggestions.append(
                "Maintain ongoing systematic rebalancing and monitor asset correlations regularly."
            )

        default_summary = (
            f"Portfolio risk is rated {overall_risk_level} (Score: {risk_score}/100) across {summary.holdings_count} position(s) "
            f"valued at ${summary.total_market_value:,.2f}. Top position is {summary.top_holding_ticker} with {summary.top_holding_weight_percent:.1f}% weight."
        )

        model_used = "deterministic_rule_engine"
        llm_data = None
        if cls._has_live_llm_key():
            system_prompt = (
                "You are an institutional portfolio risk auditor at FIRASA. "
                "Audit the provided pre-computed portfolio risk metrics and diversification statistics. "
                "Do NOT perform math. Provide an institutional risk commentary. "
                "Return a JSON object with keys: 'executive_summary' (string), 'concentration_analysis' (list of strings), 'technical_exposure_warnings' (list of strings), and 'diversification_suggestions' (list of strings)."
            )
            user_prompt = (
                f"Holdings Count: {summary.holdings_count}\n"
                f"Total Market Value: ${summary.total_market_value:,.2f}\n"
                f"Top Holding: {summary.top_holding_ticker} ({summary.top_holding_weight_percent:.1f}% weight)\n"
                f"Calculated Risk Score: {risk_score}/100 ({overall_risk_level})\n"
                f"Bearish Capital Weight: {bearish_weight_sum:.1f}%\n"
                f"Overbought Capital Weight: {overbought_weight_sum:.1f}%\n"
            )
            llm_data = cls._call_openrouter_json(system_prompt, user_prompt)
            if llm_data:
                model_used = settings.OPENROUTER_MODEL

        executive_summary = (
            llm_data.get("executive_summary", default_summary) if llm_data else default_summary
        )

        return PortfolioRiskAuditResponse(
            model_used=model_used,
            generated_at=now_str,
            overall_risk_level=overall_risk_level,
            risk_score=risk_score,
            executive_summary=executive_summary,
            concentration_analysis=(
                llm_data.get("concentration_analysis", concentration_analysis)
                if llm_data
                else concentration_analysis
            ),
            technical_exposure_warnings=(
                llm_data.get("technical_exposure_warnings", technical_warnings)
                if llm_data
                else technical_warnings
            ),
            diversification_suggestions=(
                llm_data.get("diversification_suggestions", diversification_suggestions)
                if llm_data
                else diversification_suggestions
            ),
            portfolio_snapshot={
                "total_market_value": summary.total_market_value,
                "total_cost_basis": summary.total_cost_basis,
                "total_unrealized_pl": summary.total_unrealized_pl,
                "total_unrealized_pl_percent": summary.total_unrealized_pl_percent,
                "holdings_count": summary.holdings_count,
                "top_holding": summary.top_holding_ticker,
                "top_holding_weight": summary.top_holding_weight_percent,
            },
            disclaimer=settings.DATA_DELAY_DISCLAIMER,
        )

    # =========================================================================
    # Phase 10: AI Opportunity Scanner
    # =========================================================================
    @classmethod
    def scan_opportunities(cls, db: Session) -> OpportunityScanResponse:
        """Scan watchlist universe with deterministic scoring and technical classification."""
        now_str = datetime.now(timezone.utc).isoformat()
        watchlist_items = db.query(WatchlistItem).order_by(WatchlistItem.id.asc()).all()
        if not watchlist_items:
            # Fallback default universe if table empty
            tickers = settings.DEFAULT_TICKERS
        else:
            tickers = [i.ticker for i in watchlist_items]

        candidates: List[OpportunityCandidate] = []
        bullish_count = 0
        rsi_sum = 0.0
        rsi_valid_count = 0

        for t in tickers:
            try:
                quote = MarketDataService.get_quote(db=db, ticker=t)
                ind = IndicatorService.compute_indicators(db=db, ticker=t, days=120)
                latest = ind.latest

                if latest.rsi_14 is not None:
                    rsi_sum += latest.rsi_14
                    rsi_valid_count += 1

                if latest.trend_regime == "BULLISH":
                    bullish_count += 1

                # Deterministic Setup Classification & Scoring
                setup_type = "MEAN_REVERSION_WATCH"
                signal_strength = 50
                rationale = ""

                if latest.rsi_14 is not None and latest.rsi_14 <= 35.0:
                    setup_type = "OVERSOLD_REVERSAL_WATCH"
                    signal_strength = 85
                    rationale = (
                        f"RSI-14 reached {latest.rsi_14:.1f} in oversold territory. "
                        f"Watching for mean-reversion bounce near support levels."
                    )
                elif (
                    latest.trend_regime == "BULLISH"
                    and (latest.macd_hist or 0) > 0
                    and (latest.rsi_14 or 50) < 68.0
                ):
                    setup_type = "BULLISH_TREND_MOMENTUM"
                    signal_strength = 88
                    rationale = (
                        f"Trading above SMA-20 & SMA-50 with positive MACD histogram momentum "
                        f"and sustainable RSI at {latest.rsi_14:.1f}."
                    )
                elif latest.rsi_14 is not None and latest.rsi_14 >= 70.0:
                    setup_type = "OVERBOUGHT_PULLBACK_WATCH"
                    signal_strength = 72
                    rationale = (
                        f"RSI-14 at {latest.rsi_14:.1f} signals overbought exhaustion. "
                        f"Potential retracement towards SMA-20 support."
                    )
                elif latest.trend_regime == "BULLISH":
                    setup_type = "BULLISH_TREND_MOMENTUM"
                    signal_strength = 68
                    rationale = f"Holding above moving average support with {latest.macd_state.replace('_', ' ').lower()}."
                else:
                    setup_type = "MEAN_REVERSION_WATCH"
                    signal_strength = 55
                    rationale = f"Consolidating in a {latest.trend_regime.lower()} structure with RSI at {latest.rsi_14 or 50:.1f}."

                candidates.append(
                    OpportunityCandidate(
                        ticker=t,
                        company_name=quote.company_name,
                        price=quote.price,
                        change_percent=quote.change_percent,
                        rsi_14=latest.rsi_14,
                        trend_regime=latest.trend_regime,
                        macd_state=latest.macd_state,
                        setup_type=setup_type,
                        signal_strength=signal_strength,
                        ai_rationale=rationale,
                    )
                )
            except Exception as e:
                logger.warning(f"Scanner evaluation failed for {t}: {e}")

        # Sort by signal strength descending
        candidates.sort(key=lambda x: x.signal_strength, reverse=True)

        avg_rsi = round(rsi_sum / rsi_valid_count, 1) if rsi_valid_count > 0 else 50.0
        bullish_pct = round((bullish_count / len(tickers)) * 100.0, 1) if tickers else 0.0

        market_regime_summary = (
            f"Universe Scan of {len(candidates)} equities: {bullish_pct}% in BULLISH trend regimes. "
            f"Average Watchlist RSI is {avg_rsi}."
        )

        model_used = "deterministic_rule_engine"
        if cls._has_live_llm_key():
            model_used = settings.OPENROUTER_MODEL

        return OpportunityScanResponse(
            model_used=model_used,
            generated_at=now_str,
            scanned_count=len(candidates),
            market_regime_summary=market_regime_summary,
            candidates=candidates,
            disclaimer=settings.DATA_DELAY_DISCLAIMER,
        )

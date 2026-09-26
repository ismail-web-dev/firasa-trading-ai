from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Phase 8: Market Analysis Schemas
# -------------------------------------------------------------
class MarketAnalysisResponse(BaseModel):
    ticker: str
    model_used: str  # e.g., "openai/gpt-4o-mini" or "deterministic_rule_engine"
    generated_at: str
    bias: str  # "BULLISH", "BEARISH", or "NEUTRAL"
    confidence_score: int = Field(..., ge=0, le=100)
    executive_summary: str
    technical_breakdown: List[str]
    key_levels: Dict[str, float]
    risk_factors: List[str]
    deterministic_metrics: Dict[str, Any]
    disclaimer: str


# -------------------------------------------------------------
# Phase 9: Portfolio Risk Auditor Schemas
# -------------------------------------------------------------
class PortfolioRiskAuditResponse(BaseModel):
    model_used: str
    generated_at: str
    overall_risk_level: str  # "LOW", "MODERATE", "HIGH", or "CRITICAL"
    risk_score: int = Field(..., ge=0, le=100)
    executive_summary: str
    concentration_analysis: List[str]
    technical_exposure_warnings: List[str]
    diversification_suggestions: List[str]
    portfolio_snapshot: Dict[str, Any]
    disclaimer: str


# -------------------------------------------------------------
# Phase 10: AI Opportunity Scanner Schemas
# -------------------------------------------------------------
class OpportunityCandidate(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    price: float
    change_percent: float
    rsi_14: Optional[float] = None
    trend_regime: str
    macd_state: str
    setup_type: str  # "OVERSOLD_REVERSAL_WATCH", "BULLISH_TREND_MOMENTUM", etc.
    signal_strength: int = Field(..., ge=0, le=100)
    ai_rationale: str


class OpportunityScanResponse(BaseModel):
    model_used: str
    generated_at: str
    scanned_count: int
    market_regime_summary: str
    candidates: List[OpportunityCandidate]
    disclaimer: str

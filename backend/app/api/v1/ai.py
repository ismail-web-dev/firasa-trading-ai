import logging
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.ai_agent import AIAgentService
from app.schemas.ai import (
    MarketAnalysisResponse,
    PortfolioRiskAuditResponse,
    OpportunityScanResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/analyze/{ticker}",
    response_model=MarketAnalysisResponse,
    summary="Phase 8: AI Market Analysis with Deterministic Grounding",
)
def get_market_analysis(
    ticker: str,
    db: Session = Depends(get_db),
):
    """
    Generate structured, institutional-grade AI technical market analysis for an equity.
    All indicator math and levels are pre-computed deterministically before LLM synthesis.
    """
    clean_ticker = ticker.strip().upper()
    if not (1 <= len(clean_ticker) <= 10) or not re.match(
        r"^[A-Z0-9.\-]+$", clean_ticker
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: '{ticker}'",
        )
    try:
        return AIAgentService.analyze_ticker(db=db, ticker=clean_ticker)
    except Exception as e:
        logger.error(f"Error executing AI market analysis for {clean_ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate market analysis for {clean_ticker}: {str(e)}",
        )



@router.get(
    "/portfolio-audit",
    response_model=PortfolioRiskAuditResponse,
    summary="Phase 9: AI Portfolio Risk & Diversification Auditor",
)
def get_portfolio_risk_audit(
    db: Session = Depends(get_db),
):
    """
    Audit portfolio concentration, technical regime exposure, and diversification.
    Uses deterministic risk scoring and rules-based institutional cross-referencing.
    """
    try:
        return AIAgentService.audit_portfolio_risk(db=db)
    except Exception as e:
        logger.error(f"Error auditing portfolio risk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to audit portfolio risk: {str(e)}",
        )


@router.get(
    "/opportunities",
    response_model=OpportunityScanResponse,
    summary="Phase 10: AI Technical Opportunity Scanner",
)
def get_opportunities(
    db: Session = Depends(get_db),
):
    """
    Scan universe of watchlist assets for deterministic technical setups
    (Oversold Reversals, Bullish Trend Momentum, Overbought Pullbacks).
    """
    try:
        return AIAgentService.scan_opportunities(db=db)
    except Exception as e:
        logger.error(f"Error scanning market opportunities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scan opportunities: {str(e)}",
        )

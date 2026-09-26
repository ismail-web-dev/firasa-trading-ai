import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.portfolio import PortfolioHolding
from app.services.market_data import MarketDataService
from app.schemas.portfolio import (
    HoldingCreateUpdate,
    HoldingValuation,
    PortfolioSummaryResponse,
)

logger = logging.getLogger(__name__)


class PortfolioService:
    @staticmethod
    def upsert_holding(db: Session, payload: HoldingCreateUpdate) -> PortfolioHolding:
        """Insert or update a holding by ticker."""
        clean_ticker = payload.ticker.strip().upper()
        now = datetime.now(timezone.utc)

        existing = (
            db.query(PortfolioHolding)
            .filter(PortfolioHolding.ticker == clean_ticker)
            .first()
        )

        if existing:
            existing.shares = payload.shares
            existing.avg_cost_basis = payload.avg_cost_basis
            existing.notes = payload.notes
            existing.updated_at = now
            holding = existing
        else:
            holding = PortfolioHolding(
                ticker=clean_ticker,
                shares=payload.shares,
                avg_cost_basis=payload.avg_cost_basis,
                notes=payload.notes,
                updated_at=now,
            )
            db.add(holding)

        db.commit()
        db.refresh(holding)
        return holding

    @staticmethod
    def update_holding_by_id(
        db: Session, holding_id: int, payload: HoldingCreateUpdate
    ) -> PortfolioHolding:
        """Update an existing holding by ID."""
        holding = (
            db.query(PortfolioHolding)
            .filter(PortfolioHolding.id == holding_id)
            .first()
        )
        if not holding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Portfolio holding with ID {holding_id} not found",
            )

        clean_ticker = payload.ticker.strip().upper()
        # If updating ticker, check if that ticker already exists under a different ID
        if clean_ticker != holding.ticker:
            other = (
                db.query(PortfolioHolding)
                .filter(
                    PortfolioHolding.ticker == clean_ticker,
                    PortfolioHolding.id != holding_id,
                )
                .first()
            )
            if other:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Another holding with ticker '{clean_ticker}' already exists",
                )

        holding.ticker = clean_ticker
        holding.shares = payload.shares
        holding.avg_cost_basis = payload.avg_cost_basis
        holding.notes = payload.notes
        holding.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(holding)
        return holding

    @staticmethod
    def delete_holding(db: Session, holding_id: int) -> None:
        """Delete a holding by ID."""
        holding = (
            db.query(PortfolioHolding)
            .filter(PortfolioHolding.id == holding_id)
            .first()
        )
        if not holding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Portfolio holding with ID {holding_id} not found",
            )

        db.delete(holding)
        db.commit()

    @classmethod
    def get_portfolio_summary(cls, db: Session) -> PortfolioSummaryResponse:
        """
        Deterministically calculate valuation, P/L, and allocation weights
        for all holdings in the portfolio.
        """
        holdings_records = (
            db.query(PortfolioHolding)
            .order_by(PortfolioHolding.ticker.asc())
            .all()
        )

        if not holdings_records:
            return PortfolioSummaryResponse(
                holdings_count=0,
                total_cost_basis=0.0,
                total_market_value=0.0,
                total_unrealized_pl=0.0,
                total_unrealized_pl_percent=0.0,
                total_day_change_dollar=0.0,
                total_day_change_percent=0.0,
                top_holding_ticker=None,
                top_holding_weight_percent=0.0,
                concentration_warning=False,
                holdings=[],
                disclaimer=settings.DATA_DELAY_DISCLAIMER,
            )

        # 1. Fetch quote and calculate first-pass valuations
        temp_items = []
        total_cost_basis = 0.0
        total_market_value = 0.0
        total_day_change_dollar = 0.0

        for h in holdings_records:
            try:
                quote = MarketDataService.get_quote(db=db, ticker=h.ticker)
                current_price = quote.price
                day_change_per_share = quote.change
                company_name = quote.company_name
            except Exception as e:
                logger.warning(f"Could not retrieve quote for {h.ticker}: {e}")
                current_price = h.avg_cost_basis
                day_change_per_share = 0.0
                company_name = None

            total_cost = round(h.shares * h.avg_cost_basis, 2)
            market_val = round(h.shares * current_price, 2)
            unrealized_pl = round(market_val - total_cost, 2)
            unrealized_pl_pct = (
                round((unrealized_pl / total_cost) * 100.0, 2)
                if total_cost > 0
                else 0.0
            )
            day_change_dlr = round(h.shares * day_change_per_share, 2)
            day_change_pct = (
                quote.change_percent if "quote" in locals() and quote else 0.0
            )

            total_cost_basis += total_cost
            total_market_value += market_val
            total_day_change_dollar += day_change_dlr

            temp_items.append(
                {
                    "id": h.id,
                    "ticker": h.ticker,
                    "company_name": company_name,
                    "shares": h.shares,
                    "avg_cost_basis": h.avg_cost_basis,
                    "current_price": current_price,
                    "total_cost": total_cost,
                    "market_value": market_val,
                    "unrealized_pl": unrealized_pl,
                    "unrealized_pl_percent": unrealized_pl_pct,
                    "day_change_dollar": day_change_dlr,
                    "day_change_percent": day_change_pct,
                    "notes": h.notes,
                    "updated_at": (
                        h.updated_at.isoformat()
                        if h.updated_at
                        else datetime.now(timezone.utc).isoformat()
                    ),
                }
            )

        total_cost_basis = round(total_cost_basis, 2)
        total_market_value = round(total_market_value, 2)
        total_unrealized_pl = round(total_market_value - total_cost_basis, 2)
        total_unrealized_pl_pct = (
            round((total_unrealized_pl / total_cost_basis) * 100.0, 2)
            if total_cost_basis > 0
            else 0.0
        )
        total_day_change_dollar = round(total_day_change_dollar, 2)
        prev_market_val = total_market_value - total_day_change_dollar
        total_day_change_pct = (
            round((total_day_change_dollar / prev_market_val) * 100.0, 2)
            if prev_market_val > 0
            else 0.0
        )

        # 2. Second pass: Compute weights and concentration
        valued_holdings: List[HoldingValuation] = []
        for item in temp_items:
            weight = (
                round((item["market_value"] / total_market_value) * 100.0, 2)
                if total_market_value > 0
                else 0.0
            )
            is_concentrated = weight >= 25.0

            valued_holdings.append(
                HoldingValuation(
                    id=item["id"],
                    ticker=item["ticker"],
                    company_name=item["company_name"],
                    shares=item["shares"],
                    avg_cost_basis=item["avg_cost_basis"],
                    current_price=item["current_price"],
                    total_cost=item["total_cost"],
                    market_value=item["market_value"],
                    unrealized_pl=item["unrealized_pl"],
                    unrealized_pl_percent=item["unrealized_pl_percent"],
                    day_change_dollar=item["day_change_dollar"],
                    day_change_percent=item["day_change_percent"],
                    weight_percent=weight,
                    is_concentrated=is_concentrated,
                    notes=item["notes"],
                    updated_at=item["updated_at"],
                )
            )

        # Sort holdings by market value descending
        valued_holdings.sort(key=lambda x: x.market_value, reverse=True)

        top_ticker = valued_holdings[0].ticker if valued_holdings else None
        top_weight = valued_holdings[0].weight_percent if valued_holdings else 0.0
        has_concentration = any(h.is_concentrated for h in valued_holdings)

        return PortfolioSummaryResponse(
            holdings_count=len(valued_holdings),
            total_cost_basis=total_cost_basis,
            total_market_value=total_market_value,
            total_unrealized_pl=total_unrealized_pl,
            total_unrealized_pl_percent=total_unrealized_pl_pct,
            total_day_change_dollar=total_day_change_dollar,
            total_day_change_percent=total_day_change_pct,
            top_holding_ticker=top_ticker,
            top_holding_weight_percent=top_weight,
            concentration_warning=has_concentration,
            holdings=valued_holdings,
            disclaimer=settings.DATA_DELAY_DISCLAIMER,
        )

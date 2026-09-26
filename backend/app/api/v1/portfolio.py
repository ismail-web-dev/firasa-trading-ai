from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.portfolio import (
    HoldingCreateUpdate,
    PortfolioSummaryResponse,
)
from app.services.portfolio import PortfolioService

router = APIRouter()


@router.get("", response_model=PortfolioSummaryResponse)
def get_portfolio(db: Session = Depends(get_db)):
    """Retrieve full portfolio summary with deterministic valuation and P/L."""
    return PortfolioService.get_portfolio_summary(db=db)


@router.post(
    "",
    response_model=PortfolioSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_or_upsert_holding(
    payload: HoldingCreateUpdate,
    db: Session = Depends(get_db),
):
    """Add or update a holding position by ticker."""
    PortfolioService.upsert_holding(db=db, payload=payload)
    return PortfolioService.get_portfolio_summary(db=db)


@router.put("/{holding_id}", response_model=PortfolioSummaryResponse)
def update_holding(
    holding_id: int,
    payload: HoldingCreateUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing holding position by its ID."""
    PortfolioService.update_holding_by_id(
        db=db, holding_id=holding_id, payload=payload
    )
    return PortfolioService.get_portfolio_summary(db=db)


@router.delete("/{holding_id}", response_model=PortfolioSummaryResponse)
def delete_holding(
    holding_id: int,
    db: Session = Depends(get_db),
):
    """Remove a holding position from the portfolio by its ID."""
    PortfolioService.delete_holding(db=db, holding_id=holding_id)
    return PortfolioService.get_portfolio_summary(db=db)

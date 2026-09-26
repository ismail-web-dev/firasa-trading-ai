import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class HoldingCreateUpdate(BaseModel):
    ticker: str = Field(..., description="Ticker symbol")
    shares: float = Field(..., gt=0, description="Number of shares (> 0)")
    avg_cost_basis: float = Field(
        ..., gt=0, description="Average purchase price per share (> 0)"
    )
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("ticker")
    @classmethod
    def validate_ticker(cls, v: str) -> str:
        clean = v.strip().upper()
        if not (1 <= len(clean) <= 10):
            raise ValueError("Ticker must be between 1 and 10 characters")
        if not re.match(r"^[A-Z0-9.\-]+$", clean):
            raise ValueError("Ticker contains invalid characters")
        return clean


class HoldingValuation(BaseModel):
    id: int
    ticker: str
    company_name: Optional[str] = None
    shares: float
    avg_cost_basis: float
    current_price: float
    total_cost: float
    market_value: float
    unrealized_pl: float
    unrealized_pl_percent: float
    day_change_dollar: float
    day_change_percent: float
    weight_percent: float
    is_concentrated: bool  # True if weight_percent >= 25.0
    notes: Optional[str] = None
    updated_at: str


class PortfolioSummaryResponse(BaseModel):
    holdings_count: int
    total_cost_basis: float
    total_market_value: float
    total_unrealized_pl: float
    total_unrealized_pl_percent: float
    total_day_change_dollar: float
    total_day_change_percent: float
    top_holding_ticker: Optional[str] = None
    top_holding_weight_percent: float = 0.0
    concentration_warning: bool = False
    holdings: List[HoldingValuation]
    disclaimer: str

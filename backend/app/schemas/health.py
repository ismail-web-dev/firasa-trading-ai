from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    project: str
    environment: str
    database_connected: bool
    seeded_watchlist_count: int
    default_tickers: List[str]
    disclaimer: str


class WatchlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    company_name: Optional[str] = None
    added_at: datetime

import re
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


class OHLCVBar(BaseModel):
    timestamp: int  # Unix milliseconds
    date: str  # YYYY-MM-DD
    open: float
    high: float
    low: float
    close: float
    volume: float


class MarketBarsResponse(BaseModel):
    ticker: str
    timeframe: str
    count: int
    cached: bool
    is_stale: bool = False
    data_source: str  # "polygon_live", "sqlite_cache", "sqlite_stale_cache", "deterministic_fallback"
    fetched_at: str
    expires_at: str
    disclaimer: str
    bars: List[OHLCVBar]


class TickerQuoteResponse(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    price: float
    change: float
    change_percent: float
    high: float
    low: float
    open: float
    prev_close: float
    volume: float
    cached: bool
    data_source: str
    updated_at: str
    disclaimer: str


class WatchlistItemCreate(BaseModel):
    ticker: str
    company_name: Optional[str] = None

    @field_validator("ticker")
    @classmethod
    def validate_ticker(cls, v: str) -> str:
        clean = v.strip().upper()
        if not (1 <= len(clean) <= 10):
            raise ValueError("Ticker must be between 1 and 10 characters")
        if not re.match(r"^[A-Z0-9.\-]+$", clean):
            raise ValueError("Ticker contains invalid characters")
        return clean


class WatchlistItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    company_name: Optional[str] = None
    added_at: str


class CacheStatusResponse(BaseModel):
    total_cached_entries: int
    calls_in_last_minute: int
    remaining_calls_per_minute: int
    limit_per_minute: int
    cache_ttl_minutes: int
    has_live_polygon_key: bool

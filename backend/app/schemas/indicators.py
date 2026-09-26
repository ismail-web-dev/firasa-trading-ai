from typing import List, Optional
from pydantic import BaseModel


class IndicatorPoint(BaseModel):
    date: str  # YYYY-MM-DD
    timestamp: int  # Unix milliseconds
    close: float
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None


class LatestIndicatorSnapshot(BaseModel):
    close: float
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    rsi_14: Optional[float] = None
    rsi_state: str  # "OVERBOUGHT", "OVERSOLD", or "NEUTRAL"
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    macd_state: str  # "BULLISH_CROSS", "BEARISH_CROSS", "BULLISH_MOMENTUM", "BEARISH_MOMENTUM", "NEUTRAL"
    trend_regime: str  # "BULLISH", "BEARISH", "SIDEWAYS"


class TickerIndicatorsResponse(BaseModel):
    ticker: str
    timeframe: str = "1D"
    days: int
    count: int
    cached: bool
    data_source: str
    latest: LatestIndicatorSnapshot
    series: List[IndicatorPoint]
    disclaimer: str

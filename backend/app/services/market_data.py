import json
import logging
import time
from collections import deque
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any

import httpx
import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.market_cache import MarketDataCache
from app.models.watchlist import WatchlistItem
from app.schemas.market import (
    OHLCVBar,
    MarketBarsResponse,
    TickerQuoteResponse,
)

logger = logging.getLogger(__name__)

# Strict 5 calls/minute rate limiter
RATE_LIMIT_MAX_CALLS = 5
RATE_LIMIT_WINDOW_SECONDS = 60.0
_call_timestamps = deque()


def can_make_external_call() -> bool:
    """Check if external call is permitted within 5 calls/min limit."""
    now = time.monotonic()
    while _call_timestamps and (now - _call_timestamps[0]) > RATE_LIMIT_WINDOW_SECONDS:
        _call_timestamps.popleft()
    return len(_call_timestamps) < RATE_LIMIT_MAX_CALLS


def record_external_call() -> None:
    """Record a timestamp when external call is made."""
    _call_timestamps.append(time.monotonic())


def get_rate_limit_status() -> Dict[str, int]:
    """Return current rate limiter metrics."""
    now = time.monotonic()
    while _call_timestamps and (now - _call_timestamps[0]) > RATE_LIMIT_WINDOW_SECONDS:
        _call_timestamps.popleft()
    calls = len(_call_timestamps)
    return {
        "calls_in_last_minute": calls,
        "remaining_calls_per_minute": max(0, RATE_LIMIT_MAX_CALLS - calls),
        "limit_per_minute": RATE_LIMIT_MAX_CALLS,
    }


def is_live_polygon_key_configured() -> bool:
    """Check if valid live Polygon API key is configured."""
    key = settings.POLYGON_API_KEY
    if not key or key in ("your_polygon_api_key_here", ""):
        return False
    return True


class MarketDataService:
    @staticmethod
    def _generate_deterministic_bars(ticker: str, days: int) -> List[OHLCVBar]:
        """
        Generate deterministic, realistic historical daily OHLCV bars.
        Seeded by sum(ord(c) for c in ticker) using numpy.random.default_rng.
        """
        seed = sum(ord(c) for c in ticker)
        rng = np.random.default_rng(seed)

        # Baseline starting price by ticker or seed
        ticker_base_map = {
            "AAPL": 185.0,
            "NVDA": 120.0,
            "MSFT": 420.0,
            "AMZN": 180.0,
            "GOOGL": 175.0,
            "TSLA": 250.0,
            "META": 500.0,
            "JPM": 200.0,
            "V": 275.0,
            "NFLX": 680.0,
        }
        current_price = ticker_base_map.get(ticker, 100.0 + (seed % 150))

        # Generate business days going backwards
        today = datetime.now(timezone.utc).date()
        target_dates = []
        cur_date = today
        while len(target_dates) < days:
            if cur_date.weekday() < 5:  # Monday to Friday
                target_dates.append(cur_date)
            cur_date -= timedelta(days=1)
        target_dates.reverse()

        bars: List[OHLCVBar] = []
        for d in target_dates:
            daily_drift = rng.normal(0.0005, 0.015)
            intra_volatility = rng.uniform(0.01, 0.025)
            open_price = round(float(current_price * (1.0 + rng.normal(0, 0.004))), 2)
            close_price = round(float(open_price * (1.0 + daily_drift)), 2)
            high_price = round(float(max(open_price, close_price) * (1.0 + intra_volatility * rng.uniform(0.3, 1.0))), 2)
            low_price = round(float(min(open_price, close_price) * (1.0 - intra_volatility * rng.uniform(0.3, 1.0))), 2)
            volume = round(float(rng.uniform(10_000_000, 60_000_000)), 0)

            # Unix ms timestamp for midnight UTC of date
            dt = datetime(d.year, d.month, d.day, 16, 0, tzinfo=timezone.utc)
            ts = int(dt.timestamp() * 1000)

            bars.append(
                OHLCVBar(
                    timestamp=ts,
                    date=d.isoformat(),
                    open=open_price,
                    high=high_price,
                    low=low_price,
                    close=close_price,
                    volume=volume,
                )
            )
            current_price = close_price

        return bars

    @classmethod
    def get_daily_bars(
        cls,
        db: Session,
        ticker: str,
        days: int = 90,
        force_refresh: bool = False,
    ) -> MarketBarsResponse:
        """
        Fetch daily OHLCV bars with SQLite caching, strict 5 req/min rate limit,
        and deterministic fallback.
        """
        ticker = ticker.strip().upper()
        now = datetime.now(timezone.utc)
        cache_key = f"bars:{ticker}:{days}"

        # 1. Check SQLite Cache
        cached_entry = (
            db.query(MarketDataCache)
            .filter(MarketDataCache.cache_key == cache_key)
            .first()
        )

        if cached_entry and not force_refresh:
            # Check if still valid (fresh)
            expires_at = cached_entry.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if expires_at > now:
                try:
                    payload = json.loads(cached_entry.payload_json)
                    bars = [OHLCVBar(**b) for b in payload]
                    fetched_at_str = (
                        cached_entry.fetched_at.isoformat()
                        if cached_entry.fetched_at
                        else now.isoformat()
                    )
                    return MarketBarsResponse(
                        ticker=ticker,
                        timeframe="1D",
                        count=len(bars),
                        cached=True,
                        is_stale=False,
                        data_source="sqlite_cache",
                        fetched_at=fetched_at_str,
                        expires_at=expires_at.isoformat(),
                        disclaimer=settings.DATA_DELAY_DISCLAIMER,
                        bars=bars,
                    )
                except Exception as e:
                    logger.warning(f"Failed to deserialize cache for {cache_key}: {e}")

        # 2. Attempt Live Polygon.io API Call
        has_key = is_live_polygon_key_configured()
        if has_key and can_make_external_call():
            to_date = now.strftime("%Y-%m-%d")
            # Calculate calendar span with buffer for weekends/holidays
            calendar_days = int(days * 1.5) + 10
            from_date = (now - timedelta(days=calendar_days)).strftime("%Y-%m-%d")
            url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"

            try:
                record_external_call()
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(
                        url,
                        params={
                            "adjusted": "true",
                            "sort": "asc",
                            "limit": 500,
                            "apiKey": settings.POLYGON_API_KEY,
                        },
                    )

                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    if results:
                        bars = []
                        for item in results:
                            # Polygon item keys: t, o, h, l, c, v
                            ts_ms = item["t"]
                            bar_date = datetime.fromtimestamp(
                                ts_ms / 1000.0, tz=timezone.utc
                            ).strftime("%Y-%m-%d")
                            bars.append(
                                OHLCVBar(
                                    timestamp=ts_ms,
                                    date=bar_date,
                                    open=round(float(item["o"]), 2),
                                    high=round(float(item["h"]), 2),
                                    low=round(float(item["l"]), 2),
                                    close=round(float(item["c"]), 2),
                                    volume=round(float(item.get("v", 0)), 0),
                                )
                            )

                        # Keep requested business days
                        bars = bars[-days:]
                        expires = now + timedelta(minutes=settings.CACHE_TTL_MINUTES)
                        payload_json = json.dumps([b.model_dump() for b in bars])

                        # Upsert cache
                        if cached_entry:
                            cached_entry.payload_json = payload_json
                            cached_entry.fetched_at = now
                            cached_entry.expires_at = expires
                        else:
                            cached_entry = MarketDataCache(
                                cache_key=cache_key,
                                ticker=ticker,
                                endpoint_type="bars",
                                payload_json=payload_json,
                                fetched_at=now,
                                expires_at=expires,
                            )
                            db.add(cached_entry)
                        db.commit()

                        return MarketBarsResponse(
                            ticker=ticker,
                            timeframe="1D",
                            count=len(bars),
                            cached=False,
                            is_stale=False,
                            data_source="polygon_live",
                            fetched_at=now.isoformat(),
                            expires_at=expires.isoformat(),
                            disclaimer=settings.DATA_DELAY_DISCLAIMER,
                            bars=bars,
                        )
                else:
                    logger.warning(
                        f"Polygon API returned status {resp.status_code} for {ticker}: {resp.text}"
                    )
            except Exception as e:
                logger.error(f"Error fetching from Polygon for {ticker}: {e}")

        # 3. Fallback: Stale Cache (only if not forcing refresh)
        if cached_entry and not force_refresh:
            try:
                payload = json.loads(cached_entry.payload_json)
                bars = [OHLCVBar(**b) for b in payload]
                return MarketBarsResponse(
                    ticker=ticker,
                    timeframe="1D",
                    count=len(bars),
                    cached=True,
                    is_stale=True,
                    data_source="sqlite_stale_cache",
                    fetched_at=(
                        cached_entry.fetched_at.isoformat()
                        if cached_entry.fetched_at
                        else now.isoformat()
                    ),
                    expires_at=cached_entry.expires_at.isoformat(),
                    disclaimer=settings.DATA_DELAY_DISCLAIMER,
                    bars=bars,
                )
            except Exception as e:
                logger.warning(f"Failed to use stale cache for {ticker}: {e}")

        # 4. Fallback: Deterministic Synthetic Data
        bars = cls._generate_deterministic_bars(ticker, days=days)
        expires = now + timedelta(minutes=settings.CACHE_TTL_MINUTES)
        payload_json = json.dumps([b.model_dump() for b in bars])

        if cached_entry:
            cached_entry.payload_json = payload_json
            cached_entry.fetched_at = now
            cached_entry.expires_at = expires
        else:
            cached_entry = MarketDataCache(
                cache_key=cache_key,
                ticker=ticker,
                endpoint_type="bars",
                payload_json=payload_json,
                fetched_at=now,
                expires_at=expires,
            )
            db.add(cached_entry)
        db.commit()

        return MarketBarsResponse(
            ticker=ticker,
            timeframe="1D",
            count=len(bars),
            cached=False,
            is_stale=False,
            data_source="deterministic_fallback",
            fetched_at=now.isoformat(),
            expires_at=expires.isoformat(),
            disclaimer=settings.DATA_DELAY_DISCLAIMER,
            bars=bars,
        )

    @classmethod
    def get_quote(cls, db: Session, ticker: str) -> TickerQuoteResponse:
        """Derive quote from daily bars and watchlist company name."""
        ticker = ticker.strip().upper()
        bars_resp = cls.get_daily_bars(db, ticker, days=30)
        bars = bars_resp.bars
        if not bars:
            raise ValueError(f"No price data available for ticker {ticker}")

        latest_bar = bars[-1]
        prev_bar = bars[-2] if len(bars) > 1 else latest_bar

        price = latest_bar.close
        prev_close = prev_bar.close
        change = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0.0

        company_item = (
            db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker).first()
        )
        company_name = company_item.company_name if company_item else None

        return TickerQuoteResponse(
            ticker=ticker,
            company_name=company_name,
            price=price,
            change=change,
            change_percent=change_pct,
            high=latest_bar.high,
            low=latest_bar.low,
            open=latest_bar.open,
            prev_close=prev_close,
            volume=latest_bar.volume,
            cached=bars_resp.cached,
            data_source=bars_resp.data_source,
            updated_at=datetime.now(timezone.utc).isoformat(),
            disclaimer=settings.DATA_DELAY_DISCLAIMER,
        )

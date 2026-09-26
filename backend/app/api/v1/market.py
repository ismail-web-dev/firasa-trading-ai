from datetime import datetime, timezone
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.market_cache import MarketDataCache
from app.models.watchlist import WatchlistItem
from app.schemas.market import (
    MarketBarsResponse,
    TickerQuoteResponse,
    WatchlistItemCreate,
    WatchlistItemRead,
    CacheStatusResponse,
)
from app.schemas.indicators import TickerIndicatorsResponse
from app.services.market_data import (
    MarketDataService,
    get_rate_limit_status,
    is_live_polygon_key_configured,
)
from app.services.indicators import IndicatorService

router = APIRouter()


@router.get("/bars/{ticker}", response_model=MarketBarsResponse)
def get_market_bars(
    ticker: str,
    days: int = Query(90, ge=7, le=365),
    force_refresh: bool = False,
    db: Session = Depends(get_db),
):
    """Retrieve historical daily OHLCV bars with SQLite caching."""
    clean_ticker = ticker.strip().upper()
    if not (1 <= len(clean_ticker) <= 10) or not re.match(
        r"^[A-Z0-9.\-]+$", clean_ticker
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: '{ticker}'",
        )

    try:
        return MarketDataService.get_daily_bars(
            db=db,
            ticker=clean_ticker,
            days=days,
            force_refresh=force_refresh,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch bars for {clean_ticker}: {str(e)}",
        )


@router.get("/quote/{ticker}", response_model=TickerQuoteResponse)
def get_market_quote(ticker: str, db: Session = Depends(get_db)):
    """Retrieve derived quote metrics for a single ticker."""
    clean_ticker = ticker.strip().upper()
    if not (1 <= len(clean_ticker) <= 10) or not re.match(
        r"^[A-Z0-9.\-]+$", clean_ticker
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: '{ticker}'",
        )

    try:
        return MarketDataService.get_quote(db=db, ticker=clean_ticker)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to derive quote for {clean_ticker}: {str(e)}",
        )


@router.get("/quotes", response_model=List[TickerQuoteResponse])
def get_market_quotes(
    tickers: Optional[str] = Query(None, description="Comma-separated ticker list"),
    db: Session = Depends(get_db),
):
    """Retrieve quotes for specified tickers, or all tickers in the watchlist."""
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    else:
        items = db.query(WatchlistItem).order_by(WatchlistItem.id.asc()).all()
        ticker_list = [item.ticker for item in items]

    quotes = []
    for t in ticker_list:
        try:
            quote = MarketDataService.get_quote(db=db, ticker=t)
            quotes.append(quote)
        except Exception:
            continue
    return quotes


@router.get("/cache-status", response_model=CacheStatusResponse)
def get_cache_status(db: Session = Depends(get_db)):
    """Retrieve SQLite cache metrics and rate limiter status."""
    total_cached = db.query(MarketDataCache).count()
    rl_status = get_rate_limit_status()

    return CacheStatusResponse(
        total_cached_entries=total_cached,
        calls_in_last_minute=rl_status["calls_in_last_minute"],
        remaining_calls_per_minute=rl_status["remaining_calls_per_minute"],
        limit_per_minute=rl_status["limit_per_minute"],
        cache_ttl_minutes=settings.CACHE_TTL_MINUTES,
        has_live_polygon_key=is_live_polygon_key_configured(),
    )


@router.get("/indicators/{ticker}", response_model=TickerIndicatorsResponse)
def get_ticker_indicators(
    ticker: str,
    days: int = Query(120, ge=30, le=365),
    force_refresh: bool = False,
    db: Session = Depends(get_db),
):
    """Retrieve deterministically computed technical indicators (SMA, RSI, MACD)."""
    clean_ticker = ticker.strip().upper()
    if not (1 <= len(clean_ticker) <= 10) or not re.match(
        r"^[A-Z0-9.\-]+$", clean_ticker
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: '{ticker}'",
        )

    try:
        return IndicatorService.compute_indicators(
            db=db,
            ticker=clean_ticker,
            days=days,
            force_refresh=force_refresh,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate indicators for {clean_ticker}: {str(e)}",
        )


# --- Watchlist CRUD Endpoints ---


@router.get("/watchlist", response_model=List[WatchlistItemRead])
def list_watchlist(db: Session = Depends(get_db)):
    """List all watchlist items ordered by id."""
    items = db.query(WatchlistItem).order_by(WatchlistItem.id.asc()).all()
    return [
        WatchlistItemRead(
            id=i.id,
            ticker=i.ticker,
            company_name=i.company_name,
            added_at=i.added_at.isoformat() if i.added_at else "",
        )
        for i in items
    ]


@router.post(
    "/watchlist",
    response_model=WatchlistItemRead,
    status_code=status.HTTP_201_CREATED,
)
def add_watchlist_item(
    payload: WatchlistItemCreate,
    db: Session = Depends(get_db),
):
    """Add a new ticker to the watchlist."""
    existing = (
        db.query(WatchlistItem).filter(WatchlistItem.ticker == payload.ticker).first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ticker '{payload.ticker}' already exists in watchlist",
        )

    item = WatchlistItem(
        ticker=payload.ticker,
        company_name=payload.company_name,
        added_at=datetime.now(timezone.utc),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return WatchlistItemRead(
        id=item.id,
        ticker=item.ticker,
        company_name=item.company_name,
        added_at=item.added_at.isoformat(),
    )


@router.delete("/watchlist/{ticker}")
def delete_watchlist_item(ticker: str, db: Session = Depends(get_db)):
    """Remove a ticker from the watchlist."""
    clean_ticker = ticker.strip().upper()
    item = (
        db.query(WatchlistItem).filter(WatchlistItem.ticker == clean_ticker).first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{clean_ticker}' not found in watchlist",
        )

    db.delete(item)
    db.commit()
    return {
        "status": "success",
        "message": f"Ticker '{clean_ticker}' removed from watchlist",
    }

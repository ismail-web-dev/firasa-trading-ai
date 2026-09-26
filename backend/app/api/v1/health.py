from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.session import get_db
from app.models.watchlist import WatchlistItem
from app.schemas.health import HealthResponse, WatchlistItemResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)):
    """Health check endpoint verifying DB connection and seeded watchlist."""
    try:
        # Check SQLite connectivity
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception as e:
        db_connected = False
        raise HTTPException(
            status_code=500, detail=f"Database connection failed: {e}"
        )

    count = db.query(WatchlistItem).count()

    return HealthResponse(
        status="healthy" if db_connected else "degraded",
        project=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
        database_connected=db_connected,
        seeded_watchlist_count=count,
        default_tickers=settings.DEFAULT_TICKERS,
        disclaimer=settings.DATA_DELAY_DISCLAIMER,
    )


@router.get("/watchlist", response_model=List[WatchlistItemResponse])
def get_watchlist(db: Session = Depends(get_db)):
    """Return all items in the watchlist."""
    items = db.query(WatchlistItem).order_by(WatchlistItem.id.asc()).all()
    return items

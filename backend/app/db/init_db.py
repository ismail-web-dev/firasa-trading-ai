import logging
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.market_cache import MarketDataCache
from app.models.watchlist import WatchlistItem
from app.models.portfolio import PortfolioHolding
from app.models.alert import AlertRule

logger = logging.getLogger(__name__)

DEFAULT_WATCHLIST_DATA = [
    {"ticker": "AAPL", "company_name": "Apple Inc."},
    {"ticker": "GOOGL", "company_name": "Alphabet Inc."},
    {"ticker": "MSFT", "company_name": "Microsoft Corp."},
    {"ticker": "AMZN", "company_name": "Amazon.com Inc."},
    {"ticker": "TSLA", "company_name": "Tesla Inc."},
    {"ticker": "NVDA", "company_name": "NVIDIA Corp."},
    {"ticker": "META", "company_name": "Meta Platforms Inc."},
    {"ticker": "JPM", "company_name": "JPMorgan Chase & Co."},
    {"ticker": "V", "company_name": "Visa Inc."},
    {"ticker": "NFLX", "company_name": "Netflix Inc."},
]


def init_db() -> None:
    """Initialize database tables and seed default watchlist tickers."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized.")

    db = SessionLocal()
    try:
        existing_count = db.query(WatchlistItem).count()
        if existing_count == 0:
            logger.info("Seeding default watchlist items...")
            for item in DEFAULT_WATCHLIST_DATA:
                db_item = WatchlistItem(
                    ticker=item["ticker"],
                    company_name=item["company_name"],
                )
                db.add(db_item)
            db.commit()
            logger.info(f"Seeded {len(DEFAULT_WATCHLIST_DATA)} default watchlist items.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error during database initialization/seeding: {e}")
        raise
    finally:
        db.close()

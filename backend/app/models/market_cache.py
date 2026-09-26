from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.db.base import Base


def utc_now():
    return datetime.now(timezone.utc)


class MarketDataCache(Base):
    __tablename__ = "market_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(255), unique=True, index=True, nullable=False)
    ticker = Column(String(20), index=True, nullable=False)
    endpoint_type = Column(String(50), nullable=False)  # "bars", "snapshot", "details"
    payload_json = Column(Text, nullable=False)
    fetched_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

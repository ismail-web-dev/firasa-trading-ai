from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.market import router as market_router
from app.api.v1.portfolio import router as portfolio_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.ai import router as ai_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health & System"])
api_router.include_router(
    market_router, prefix="/market", tags=["Market Data & Watchlist"]
)
api_router.include_router(
    portfolio_router, prefix="/portfolio", tags=["Portfolio Tracking"]
)
api_router.include_router(
    alerts_router, prefix="/alerts", tags=["Price & Technical Alerts"]
)
api_router.include_router(
    ai_router, prefix="/ai", tags=["AI Market Intelligence"]
)


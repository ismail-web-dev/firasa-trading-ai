import logging
from typing import List, Optional
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.market_data import MarketDataService
from app.schemas.indicators import (
    IndicatorPoint,
    LatestIndicatorSnapshot,
    TickerIndicatorsResponse,
)

logger = logging.getLogger(__name__)


class IndicatorService:
    @staticmethod
    def compute_indicators(
        db: Session,
        ticker: str,
        days: int = 120,
        force_refresh: bool = False,
    ) -> TickerIndicatorsResponse:
        """
        Compute deterministic technical indicators (SMA 20/50, RSI 14, MACD 12/26/9)
        strictly using Pandas & NumPy over daily OHLCV bars.
        """
        ticker = ticker.strip().upper()

        # Warm-up requirement: Request extra bars so 50-day rolling and MACD 26 EMA stabilize
        fetch_days = max(days, 120)
        bars_resp = MarketDataService.get_daily_bars(
            db=db,
            ticker=ticker,
            days=fetch_days,
            force_refresh=force_refresh,
        )

        bars = bars_resp.bars
        if not bars:
            raise ValueError(f"No market data available for indicator computation on {ticker}")

        # Convert to DataFrame
        data = [
            {
                "timestamp": b.timestamp,
                "date": b.date,
                "open": b.open,
                "high": b.high,
                "low": b.low,
                "close": b.close,
                "volume": b.volume,
            }
            for b in bars
        ]
        df = pd.DataFrame(data)
        df.sort_values(by="timestamp", ascending=True, inplace=True)
        df.reset_index(drop=True, inplace=True)

        # 1. Moving Averages
        df["sma_20"] = df["close"].rolling(window=20, min_periods=20).mean()
        df["sma_50"] = df["close"].rolling(window=50, min_periods=50).mean()

        # 2. RSI (14-period Wilder's Smoothing)
        delta = df["close"].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)

        # Wilder's smoothing alpha = 1 / 14
        avg_gain = gain.ewm(alpha=1.0 / 14.0, min_periods=14, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / 14.0, min_periods=14, adjust=False).mean()

        rs = np.where(avg_loss == 0, np.nan, avg_gain / avg_loss)
        rsi = np.where(
            avg_loss == 0,
            np.where(avg_gain > 0, 100.0, 50.0),
            100.0 - (100.0 / (1.0 + rs)),
        )
        # Handle initial warm-up periods where avg_gain is NaN
        rsi = np.where(avg_gain.isna(), np.nan, rsi)
        df["rsi_14"] = np.clip(rsi, 0.0, 100.0)

        # 3. MACD (12, 26, 9)
        ema_12 = df["close"].ewm(span=12, adjust=False).mean()
        ema_26 = df["close"].ewm(span=26, adjust=False).mean()
        df["macd"] = ema_12 - ema_26
        df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
        df["macd_hist"] = df["macd"] - df["macd_signal"]

        # Limit series to requested days (tail)
        df_target = df.iloc[-days:].copy() if len(df) > days else df.copy()

        def clean_val(val: Optional[float], decimals: int = 4) -> Optional[float]:
            if pd.isna(val) or np.isinf(val):
                return None
            return round(float(val), decimals)

        series: List[IndicatorPoint] = []
        for _, row in df_target.iterrows():
            pt = IndicatorPoint(
                date=str(row["date"]),
                timestamp=int(row["timestamp"]),
                close=round(float(row["close"]), 2),
                sma_20=clean_val(row["sma_20"], 2),
                sma_50=clean_val(row["sma_50"], 2),
                rsi_14=clean_val(row["rsi_14"], 2),
                macd=clean_val(row["macd"], 4),
                macd_signal=clean_val(row["macd_signal"], 4),
                macd_hist=clean_val(row["macd_hist"], 4),
            )
            series.append(pt)

        # Compute snapshot from the latest row
        last_row = df_target.iloc[-1]
        last_close = round(float(last_row["close"]), 2)
        last_sma20 = clean_val(last_row["sma_20"], 2)
        last_sma50 = clean_val(last_row["sma_50"], 2)
        last_rsi = clean_val(last_row["rsi_14"], 2)
        last_macd = clean_val(last_row["macd"], 4)
        last_signal = clean_val(last_row["macd_signal"], 4)
        last_hist = clean_val(last_row["macd_hist"], 4)

        # RSI State
        if last_rsi is not None:
            if last_rsi >= 70.0:
                rsi_state = "OVERBOUGHT"
            elif last_rsi <= 30.0:
                rsi_state = "OVERSOLD"
            else:
                rsi_state = "NEUTRAL"
        else:
            rsi_state = "NEUTRAL"

        # MACD State
        if last_hist is not None:
            if last_hist > 0:
                macd_state = "BULLISH_MOMENTUM"
            elif last_hist < 0:
                macd_state = "BEARISH_MOMENTUM"
            else:
                macd_state = "NEUTRAL"
        else:
            macd_state = "NEUTRAL"

        # Trend Regime
        if last_sma20 is not None:
            if last_close > last_sma20 and (last_sma50 is None or last_sma20 >= last_sma50):
                trend_regime = "BULLISH"
            elif last_close < last_sma20 and (last_sma50 is None or last_sma20 < last_sma50):
                trend_regime = "BEARISH"
            else:
                trend_regime = "SIDEWAYS"
        else:
            trend_regime = "SIDEWAYS"

        latest_snapshot = LatestIndicatorSnapshot(
            close=last_close,
            sma_20=last_sma20,
            sma_50=last_sma50,
            rsi_14=last_rsi,
            rsi_state=rsi_state,
            macd=last_macd,
            macd_signal=last_signal,
            macd_hist=last_hist,
            macd_state=macd_state,
            trend_regime=trend_regime,
        )

        return TickerIndicatorsResponse(
            ticker=ticker,
            timeframe="1D",
            days=days,
            count=len(series),
            cached=bars_resp.cached,
            data_source=bars_resp.data_source,
            latest=latest_snapshot,
            series=series,
            disclaimer=settings.DATA_DELAY_DISCLAIMER,
        )

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert import AlertRule
from app.services.indicators import IndicatorService
from app.schemas.alert import (
    AlertCreate,
    AlertRead,
    AlertsSummaryResponse,
)

logger = logging.getLogger(__name__)


class AlertService:
    @staticmethod
    def create_alert(db: Session, payload: AlertCreate) -> AlertRule:
        """Create a new alert rule and immediately evaluate against current market metrics."""
        clean_ticker = payload.ticker.strip().upper()
        now = datetime.now(timezone.utc)

        rule = AlertRule(
            ticker=clean_ticker,
            condition_type=payload.condition_type,
            threshold_value=payload.threshold_value,
            is_active=True,
            triggered_at=None,
            created_at=now,
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)

        # Immediate single-rule evaluation
        try:
            ind_resp = IndicatorService.compute_indicators(db=db, ticker=clean_ticker, days=120)
            latest = ind_resp.latest
            met = AlertService._evaluate_rule_condition(
                condition_type=rule.condition_type,
                threshold=rule.threshold_value,
                latest=latest,
            )
            if met:
                rule.triggered_at = now
                db.commit()
                db.refresh(rule)
        except Exception as e:
            logger.warning(f"Failed immediate evaluation for new alert on {clean_ticker}: {e}")

        return rule

    @staticmethod
    def delete_alert(db: Session, alert_id: int) -> None:
        """Delete an alert rule by ID."""
        rule = db.query(AlertRule).filter(AlertRule.id == alert_id).first()
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert rule with ID {alert_id} not found",
            )
        db.delete(rule)
        db.commit()

    @staticmethod
    def toggle_or_reset_alert(
        db: Session, alert_id: int, is_active: Optional[bool] = None, reset_trigger: bool = False
    ) -> AlertRule:
        """Toggle active state or reset trigger on an alert rule."""
        rule = db.query(AlertRule).filter(AlertRule.id == alert_id).first()
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert rule with ID {alert_id} not found",
            )

        if is_active is not None:
            rule.is_active = is_active
        if reset_trigger:
            rule.triggered_at = None

        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def _evaluate_rule_condition(
        condition_type: str, threshold: float, latest: Any
    ) -> bool:
        """Check if latest metrics satisfy rule condition."""
        if condition_type == "PRICE_ABOVE":
            return latest.close >= threshold
        elif condition_type == "PRICE_BELOW":
            return latest.close <= threshold
        elif condition_type == "RSI_ABOVE":
            return (latest.rsi_14 is not None) and (latest.rsi_14 >= threshold)
        elif condition_type == "RSI_BELOW":
            return (latest.rsi_14 is not None) and (latest.rsi_14 <= threshold)
        elif condition_type == "SMA20_ABOVE_SMA50":
            return (
                latest.sma_20 is not None
                and latest.sma_50 is not None
                and latest.sma_20 > latest.sma_50
            )
        elif condition_type == "SMA20_BELOW_SMA50":
            return (
                latest.sma_20 is not None
                and latest.sma_50 is not None
                and latest.sma_20 < latest.sma_50
            )
        return False

    @classmethod
    def evaluate_and_list_alerts(cls, db: Session) -> AlertsSummaryResponse:
        """
        Evaluate all alert rules against deterministically computed indicators/quotes
        and return summary.
        """
        rules = db.query(AlertRule).order_by(AlertRule.id.desc()).all()
        if not rules:
            return AlertsSummaryResponse(
                total_alerts=0,
                active_count=0,
                triggered_count=0,
                alerts=[],
                disclaimer=settings.DATA_DELAY_DISCLAIMER,
            )

        # Batch compute indicator snapshots for unique tickers
        unique_tickers = list({r.ticker for r in rules})
        snapshots: Dict[str, Any] = {}
        for t in unique_tickers:
            try:
                ind = IndicatorService.compute_indicators(db=db, ticker=t, days=120)
                snapshots[t] = ind.latest
            except Exception as e:
                logger.warning(f"Could not compute indicator snapshot for alert ticker {t}: {e}")
                snapshots[t] = None

        now = datetime.now(timezone.utc)
        evaluated_items: List[AlertRead] = []
        needs_commit = False

        for r in rules:
            latest = snapshots.get(r.ticker)
            metric_val: Optional[float] = None
            status_msg = ""
            is_met = False

            if latest is not None:
                if r.condition_type in ("PRICE_ABOVE", "PRICE_BELOW"):
                    metric_val = latest.close
                    if r.condition_type == "PRICE_ABOVE":
                        is_met = latest.close >= r.threshold_value
                        status_msg = (
                            f"Price ${latest.close:.2f} >= Target ${r.threshold_value:.2f}"
                        )
                    else:
                        is_met = latest.close <= r.threshold_value
                        status_msg = (
                            f"Price ${latest.close:.2f} <= Target ${r.threshold_value:.2f}"
                        )
                elif r.condition_type in ("RSI_ABOVE", "RSI_BELOW"):
                    metric_val = latest.rsi_14
                    if latest.rsi_14 is not None:
                        if r.condition_type == "RSI_ABOVE":
                            is_met = latest.rsi_14 >= r.threshold_value
                            status_msg = (
                                f"RSI {latest.rsi_14:.2f} >= Target {r.threshold_value:.1f}"
                            )
                        else:
                            is_met = latest.rsi_14 <= r.threshold_value
                            status_msg = (
                                f"RSI {latest.rsi_14:.2f} <= Target {r.threshold_value:.1f}"
                            )
                    else:
                        status_msg = "RSI warming up..."
                elif r.condition_type in ("SMA20_ABOVE_SMA50", "SMA20_BELOW_SMA50"):
                    if latest.sma_20 is not None and latest.sma_50 is not None:
                        spread = round(latest.sma_20 - latest.sma_50, 2)
                        metric_val = spread
                        if r.condition_type == "SMA20_ABOVE_SMA50":
                            is_met = latest.sma_20 > latest.sma_50
                            status_msg = f"SMA20 (${latest.sma_20:.2f}) > SMA50 (${latest.sma_50:.2f})"
                        else:
                            is_met = latest.sma_20 < latest.sma_50
                            status_msg = f"SMA20 (${latest.sma_20:.2f}) < SMA50 (${latest.sma_50:.2f})"
                    else:
                        status_msg = "SMA moving averages warming up..."
            else:
                status_msg = "Awaiting market data..."

            # Evaluate trigger state change
            if r.is_active and is_met and r.triggered_at is None:
                r.triggered_at = now
                needs_commit = True

            is_currently_triggered = r.triggered_at is not None

            if not r.is_active:
                status_suffix = "[PAUSED]"
            elif is_currently_triggered:
                status_suffix = "[TRIGGERED]"
            else:
                status_suffix = "[WATCHING]"

            full_status = f"{status_msg} {status_suffix}" if status_msg else status_suffix

            evaluated_items.append(
                AlertRead(
                    id=r.id,
                    ticker=r.ticker,
                    condition_type=r.condition_type,
                    threshold_value=r.threshold_value,
                    is_active=r.is_active,
                    is_triggered=is_currently_triggered,
                    current_metric_value=metric_val,
                    status_message=full_status,
                    triggered_at=(
                        r.triggered_at.isoformat() if r.triggered_at else None
                    ),
                    created_at=(
                        r.created_at.isoformat()
                        if r.created_at
                        else now.isoformat()
                    ),
                )
            )

        if needs_commit:
            db.commit()

        active_count = sum(1 for a in evaluated_items if a.is_active)
        triggered_count = sum(1 for a in evaluated_items if a.is_triggered)

        return AlertsSummaryResponse(
            total_alerts=len(evaluated_items),
            active_count=active_count,
            triggered_count=triggered_count,
            alerts=evaluated_items,
            disclaimer=settings.DATA_DELAY_DISCLAIMER,
        )

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.alert import (
    AlertCreate,
    AlertUpdate,
    AlertsSummaryResponse,
)
from app.services.alerts import AlertService

router = APIRouter()


@router.get("", response_model=AlertsSummaryResponse)
def list_and_evaluate_alerts(db: Session = Depends(get_db)):
    """Retrieve and evaluate all price and technical indicator alert rules."""
    return AlertService.evaluate_and_list_alerts(db=db)


@router.post(
    "",
    response_model=AlertsSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_alert(
    payload: AlertCreate,
    db: Session = Depends(get_db),
):
    """Create a new alert rule and return the updated summary."""
    AlertService.create_alert(db=db, payload=payload)
    return AlertService.evaluate_and_list_alerts(db=db)


@router.post("/evaluate", response_model=AlertsSummaryResponse)
def trigger_evaluation(db: Session = Depends(get_db)):
    """Explicitly trigger re-evaluation of all alert conditions."""
    return AlertService.evaluate_and_list_alerts(db=db)


@router.patch("/{alert_id}", response_model=AlertsSummaryResponse)
def update_alert_status(
    alert_id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
):
    """Toggle active state or reset trigger on an alert rule."""
    AlertService.toggle_or_reset_alert(
        db=db,
        alert_id=alert_id,
        is_active=payload.is_active,
        reset_trigger=payload.reset_trigger or False,
    )
    return AlertService.evaluate_and_list_alerts(db=db)


@router.delete("/{alert_id}", response_model=AlertsSummaryResponse)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
):
    """Delete an alert rule by ID."""
    AlertService.delete_alert(db=db, alert_id=alert_id)
    return AlertService.evaluate_and_list_alerts(db=db)

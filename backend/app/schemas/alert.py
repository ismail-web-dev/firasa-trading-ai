import re
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator

ConditionType = Literal[
    "PRICE_ABOVE",
    "PRICE_BELOW",
    "RSI_ABOVE",
    "RSI_BELOW",
    "SMA20_ABOVE_SMA50",
    "SMA20_BELOW_SMA50",
]

ALLOWED_CONDITIONS = {
    "PRICE_ABOVE",
    "PRICE_BELOW",
    "RSI_ABOVE",
    "RSI_BELOW",
    "SMA20_ABOVE_SMA50",
    "SMA20_BELOW_SMA50",
}


class AlertCreate(BaseModel):
    ticker: str = Field(..., description="Ticker symbol")
    condition_type: str = Field(..., description="Alert condition type")
    threshold_value: float = Field(
        default=0.0,
        description="Target price or RSI threshold. Price > 0; RSI between 0 and 100",
    )

    @field_validator("ticker")
    @classmethod
    def validate_ticker(cls, v: str) -> str:
        clean = v.strip().upper()
        if not (1 <= len(clean) <= 10):
            raise ValueError("Ticker must be between 1 and 10 characters")
        if not re.match(r"^[A-Z0-9.\-]+$", clean):
            raise ValueError("Ticker contains invalid characters")
        return clean

    @field_validator("condition_type")
    @classmethod
    def validate_condition_type(cls, v: str) -> str:
        clean = v.strip()
        if clean not in ALLOWED_CONDITIONS:
            raise ValueError(
                f"Invalid condition_type: '{clean}'. Allowed: {sorted(ALLOWED_CONDITIONS)}"
            )
        return clean

    @model_validator(mode="after")
    def validate_thresholds(self):
        ctype = self.condition_type
        val = self.threshold_value

        if ctype in ("PRICE_ABOVE", "PRICE_BELOW"):
            if val <= 0.0:
                raise ValueError(
                    f"Threshold value for {ctype} must be greater than 0. Received: {val}"
                )
        elif ctype in ("RSI_ABOVE", "RSI_BELOW"):
            if not (0.0 < val < 100.0):
                raise ValueError(
                    f"Threshold value for {ctype} must be between 0 and 100. Received: {val}"
                )
        return self


class AlertUpdate(BaseModel):
    is_active: Optional[bool] = None
    reset_trigger: Optional[bool] = False


class AlertRead(BaseModel):
    id: int
    ticker: str
    condition_type: str
    threshold_value: float
    is_active: bool
    is_triggered: bool
    current_metric_value: Optional[float] = None
    status_message: str
    triggered_at: Optional[str] = None
    created_at: str


class AlertsSummaryResponse(BaseModel):
    total_alerts: int
    active_count: int
    triggered_count: int
    alerts: List[AlertRead]
    disclaimer: str

export interface OHLCVBar {
  timestamp: number; // Unix milliseconds
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketBarsResponse {
  ticker: string;
  timeframe: string;
  count: number;
  cached: boolean;
  is_stale: boolean;
  data_source: string; // "polygon_live" | "sqlite_cache" | "sqlite_stale_cache" | "deterministic_fallback"
  fetched_at: string;
  expires_at: string;
  disclaimer: string;
  bars: OHLCVBar[];
}

export interface TickerQuote {
  ticker: string;
  company_name: string | null;
  price: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  open: number;
  prev_close: number;
  volume: number;
  cached: boolean;
  data_source: string;
  updated_at: string;
  disclaimer: string;
}

export interface WatchlistItem {
  id: number;
  ticker: string;
  company_name: string | null;
  added_at: string;
}

export interface CacheStatus {
  total_cached_entries: number;
  calls_in_last_minute: number;
  remaining_calls_per_minute: number;
  limit_per_minute: number;
  cache_ttl_minutes: number;
  has_live_polygon_key: boolean;
}

export interface IndicatorPoint {
  date: string;
  timestamp: number;
  close: number;
  sma_20: number | null;
  sma_50: number | null;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_hist: number | null;
}

export interface LatestIndicatorSnapshot {
  close: number;
  sma_20: number | null;
  sma_50: number | null;
  rsi_14: number | null;
  rsi_state: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" | string;
  macd: number | null;
  macd_signal: number | null;
  macd_hist: number | null;
  macd_state:
    | "BULLISH_CROSS"
    | "BEARISH_CROSS"
    | "BULLISH_MOMENTUM"
    | "BEARISH_MOMENTUM"
    | "NEUTRAL"
    | string;
  trend_regime: "BULLISH" | "BEARISH" | "SIDEWAYS" | string;
}

export interface TickerIndicatorsResponse {
  ticker: string;
  timeframe: string;
  days: number;
  count: number;
  cached: boolean;
  data_source: string;
  latest: LatestIndicatorSnapshot;
  series: IndicatorPoint[];
  disclaimer: string;
}

export interface HoldingCreateUpdate {
  ticker: string;
  shares: number;
  avg_cost_basis: number;
  notes?: string | null;
}

export interface HoldingValuation {
  id: number;
  ticker: string;
  company_name: string | null;
  shares: number;
  avg_cost_basis: number;
  current_price: number;
  total_cost: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_pl_percent: number;
  day_change_dollar: number;
  day_change_percent: number;
  weight_percent: number;
  is_concentrated: boolean;
  notes: string | null;
  updated_at: string;
}

export interface PortfolioSummaryResponse {
  holdings_count: number;
  total_cost_basis: number;
  total_market_value: number;
  total_unrealized_pl: number;
  total_unrealized_pl_percent: number;
  total_day_change_dollar: number;
  total_day_change_percent: number;
  top_holding_ticker: string | null;
  top_holding_weight_percent: number;
  concentration_warning: boolean;
  holdings: HoldingValuation[];
  disclaimer: string;
}

export interface AlertCreate {
  ticker: string;
  condition_type:
    | "PRICE_ABOVE"
    | "PRICE_BELOW"
    | "RSI_ABOVE"
    | "RSI_BELOW"
    | "SMA20_ABOVE_SMA50"
    | "SMA20_BELOW_SMA50"
    | string;
  threshold_value: number;
}

export interface AlertRead {
  id: number;
  ticker: string;
  condition_type: string;
  threshold_value: number;
  is_active: boolean;
  is_triggered: boolean;
  current_metric_value: number | null;
  status_message: string;
  triggered_at: string | null;
  created_at: string;
}

export interface AlertsSummaryResponse {
  total_alerts: number;
  active_count: number;
  triggered_count: number;
  alerts: AlertRead[];
  disclaimer: string;
}

// -------------------------------------------------------------
// Phases 8, 9 & 10: AI Intelligence Types
// -------------------------------------------------------------
export interface MarketAnalysisResponse {
  ticker: string;
  model_used: string;
  generated_at: string;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL" | string;
  confidence_score: number;
  executive_summary: string;
  technical_breakdown: string[];
  key_levels: {
    current_price: number;
    support_estimate: number;
    resistance_estimate: number;
    sma_20: number;
    sma_50: number;
    [key: string]: number;
  };
  risk_factors: string[];
  deterministic_metrics: Record<string, any>;
  disclaimer: string;
}

export interface PortfolioRiskAuditResponse {
  model_used: string;
  generated_at: string;
  overall_risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
  risk_score: number;
  executive_summary: string;
  concentration_analysis: string[];
  technical_exposure_warnings: string[];
  diversification_suggestions: string[];
  portfolio_snapshot: {
    total_market_value: number;
    total_cost_basis: number;
    total_unrealized_pl: number;
    total_unrealized_pl_percent: number;
    holdings_count: number;
    top_holding: string | null;
    top_holding_weight: number;
    [key: string]: any;
  };
  disclaimer: string;
}

export interface OpportunityCandidate {
  ticker: string;
  company_name: string | null;
  price: number;
  change_percent: number;
  rsi_14: number | null;
  trend_regime: string;
  macd_state: string;
  setup_type: string;
  signal_strength: number;
  ai_rationale: string;
}

export interface OpportunityScanResponse {
  model_used: string;
  generated_at: string;
  scanned_count: number;
  market_regime_summary: string;
  candidates: OpportunityCandidate[];
  disclaimer: string;
}


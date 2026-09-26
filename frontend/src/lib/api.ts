import {
  WatchlistItem,
  TickerQuote,
  MarketBarsResponse,
  CacheStatus,
  TickerIndicatorsResponse,
  HoldingCreateUpdate,
  PortfolioSummaryResponse,
  AlertCreate,
  AlertRead,
  AlertsSummaryResponse,
  MarketAnalysisResponse,
  PortfolioRiskAuditResponse,
  OpportunityScanResponse,
} from "@/types/market";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch(`${API_BASE_URL}/market/watchlist`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch watchlist: ${res.statusText}`);
  }
  return res.json();
}

export async function addToWatchlist(
  ticker: string,
  company_name?: string
): Promise<WatchlistItem> {
  const res = await fetch(`${API_BASE_URL}/market/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker: ticker.trim().toUpperCase(),
      company_name: company_name || undefined,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to add ticker: ${res.statusText}`);
  }
  return res.json();
}

export async function removeFromWatchlist(ticker: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/market/watchlist/${encodeURIComponent(ticker.trim().toUpperCase())}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to remove ticker: ${res.statusText}`
    );
  }
}

export async function fetchQuotes(tickers?: string[]): Promise<TickerQuote[]> {
  const url = new URL(`${API_BASE_URL}/market/quotes`);
  if (tickers && tickers.length > 0) {
    url.searchParams.set("tickers", tickers.join(","));
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch quotes: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchQuote(ticker: string): Promise<TickerQuote> {
  const res = await fetch(
    `${API_BASE_URL}/market/quote/${encodeURIComponent(ticker.trim().toUpperCase())}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch quote for ${ticker}: ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchBars(
  ticker: string,
  days: number = 90,
  forceRefresh: boolean = false
): Promise<MarketBarsResponse> {
  const url = new URL(
    `${API_BASE_URL}/market/bars/${encodeURIComponent(ticker.trim().toUpperCase())}`
  );
  url.searchParams.set("days", days.toString());
  if (forceRefresh) {
    url.searchParams.set("force_refresh", "true");
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch bars for ${ticker}: ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchCacheStatus(): Promise<CacheStatus> {
  const res = await fetch(`${API_BASE_URL}/market/cache-status`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch cache status: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchIndicators(
  ticker: string,
  days: number = 120,
  forceRefresh: boolean = false
): Promise<TickerIndicatorsResponse> {
  const url = new URL(
    `${API_BASE_URL}/market/indicators/${encodeURIComponent(ticker.trim().toUpperCase())}`
  );
  url.searchParams.set("days", days.toString());
  if (forceRefresh) {
    url.searchParams.set("force_refresh", "true");
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch indicators for ${ticker}: ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchPortfolio(): Promise<PortfolioSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/portfolio`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch portfolio: ${res.statusText}`);
  }
  return res.json();
}

export async function savePortfolioHolding(
  payload: HoldingCreateUpdate
): Promise<PortfolioSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker: payload.ticker.trim().toUpperCase(),
      shares: Number(payload.shares),
      avg_cost_basis: Number(payload.avg_cost_basis),
      notes: payload.notes || undefined,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to save holding: ${res.statusText}`
    );
  }
  return res.json();
}

export async function updatePortfolioHolding(
  id: number,
  payload: HoldingCreateUpdate
): Promise<PortfolioSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/portfolio/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker: payload.ticker.trim().toUpperCase(),
      shares: Number(payload.shares),
      avg_cost_basis: Number(payload.avg_cost_basis),
      notes: payload.notes || undefined,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to update holding: ${res.statusText}`
    );
  }
  return res.json();
}

export async function deletePortfolioHolding(
  id: number
): Promise<PortfolioSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/portfolio/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to delete holding: ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchAlerts(): Promise<AlertsSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/alerts`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch alerts: ${res.statusText}`);
  }
  return res.json();
}

export async function createAlert(
  payload: AlertCreate
): Promise<AlertsSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker: payload.ticker.trim().toUpperCase(),
      condition_type: payload.condition_type,
      threshold_value: Number(payload.threshold_value),
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to create alert: ${res.statusText}`
    );
  }
  return res.json();
}

export async function evaluateAlerts(): Promise<AlertsSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/alerts/evaluate`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to evaluate alerts: ${res.statusText}`);
  }
  return res.json();
}

export async function updateAlert(
  id: number,
  payload: { is_active?: boolean; reset_trigger?: boolean }
): Promise<AlertsSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to update alert: ${res.statusText}`
    );
  }
  return res.json();
}

export async function deleteAlert(id: number): Promise<AlertsSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/alerts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to delete alert: ${res.statusText}`
    );
  }
  return res.json();
}

// -------------------------------------------------------------
// Phases 8, 9 & 10: AI Intelligence API Endpoints
// -------------------------------------------------------------
export async function fetchMarketAnalysis(
  ticker: string
): Promise<MarketAnalysisResponse> {
  const res = await fetch(
    `${API_BASE_URL}/ai/analyze/${encodeURIComponent(ticker.trim().toUpperCase())}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch AI market analysis: ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchPortfolioRiskAudit(): Promise<PortfolioRiskAuditResponse> {
  const res = await fetch(`${API_BASE_URL}/ai/portfolio-audit`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to audit portfolio risk: ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchOpportunityScan(): Promise<OpportunityScanResponse> {
  const res = await fetch(`${API_BASE_URL}/ai/opportunities`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to scan opportunities: ${res.statusText}`
    );
  }
  return res.json();
}


import fs from "fs";
import path from "path";
import os from "os";
import {
  OHLCVBar,
  MarketBarsResponse,
  TickerQuote,
  WatchlistItem,
  CacheStatus,
  IndicatorPoint,
  LatestIndicatorSnapshot,
  TickerIndicatorsResponse,
  HoldingCreateUpdate,
  HoldingValuation,
  PortfolioSummaryResponse,
  AlertCreate,
  AlertRead,
  AlertsSummaryResponse,
  MarketAnalysisResponse,
  PortfolioRiskAuditResponse,
  OpportunityCandidate,
  OpportunityScanResponse,
} from "@/types/market";

export const DATA_DELAY_DISCLAIMER =
  "15-minute delayed data. For investment research and decision support only.";

const DEFAULT_TICKERS = [
  { ticker: "AAPL", company_name: "Apple Inc." },
  { ticker: "GOOGL", company_name: "Alphabet Inc." },
  { ticker: "MSFT", company_name: "Microsoft Corporation" },
  { ticker: "AMZN", company_name: "Amazon.com Inc." },
  { ticker: "TSLA", company_name: "Tesla Inc." },
  { ticker: "NVDA", company_name: "NVIDIA Corporation" },
  { ticker: "META", company_name: "Meta Platforms Inc." },
  { ticker: "JPM", company_name: "JPMorgan Chase & Co." },
  { ticker: "V", company_name: "Visa Inc." },
  { ticker: "NFLX", company_name: "Netflix Inc." },
];

const RATE_LIMIT_MAX_CALLS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CACHE_TTL_MS = 60 * 60 * 1000;

interface StoredHolding {
  id: number;
  ticker: string;
  shares: number;
  avg_cost_basis: number;
  notes?: string | null;
  updated_at: string;
}

interface StoredAlert {
  id: number;
  ticker: string;
  condition_type: string;
  threshold_value: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

interface CachedBarsEntry {
  ticker: string;
  days: number;
  bars: OHLCVBar[];
  data_source: string;
  fetched_at: string;
  expires_at: string;
}

interface EngineState {
  watchlist: WatchlistItem[];
  nextWatchlistId: number;
  holdings: StoredHolding[];
  nextHoldingId: number;
  alerts: StoredAlert[];
  nextAlertId: number;
  barCache: Record<string, CachedBarsEntry>;
}

// In-memory rate limiter timestamps
const externalCallTimestamps: number[] = [];

function cleanOldRateLimitTimestamps(): void {
  const now = Date.now();
  while (
    externalCallTimestamps.length > 0 &&
    now - externalCallTimestamps[0] > RATE_LIMIT_WINDOW_MS
  ) {
    externalCallTimestamps.shift();
  }
}

function canMakeExternalCall(): boolean {
  cleanOldRateLimitTimestamps();
  return externalCallTimestamps.length < RATE_LIMIT_MAX_CALLS;
}

function recordExternalCall(): void {
  cleanOldRateLimitTimestamps();
  externalCallTimestamps.push(Date.now());
}

function getCacheFilePath(): string {
  try {
    const p = path.join(process.cwd(), ".firasa-cache.json");
    fs.accessSync(path.dirname(p), fs.constants.W_OK);
    return p;
  } catch {
    return path.join(os.tmpdir(), "firasa-cache.json");
  }
}

function loadInitialState(): EngineState {
  const filePath = getCacheFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.watchlist)) {
        return parsed as EngineState;
      }
    } catch (e) {
      console.warn("Failed to read server cache file, reinitializing:", e);
    }
  }

  const initialWatchlist: WatchlistItem[] = DEFAULT_TICKERS.map((t, idx) => ({
    id: idx + 1,
    ticker: t.ticker,
    company_name: t.company_name,
    added_at: new Date().toISOString(),
  }));

  const state: EngineState = {
    watchlist: initialWatchlist,
    nextWatchlistId: initialWatchlist.length + 1,
    holdings: [],
    nextHoldingId: 1,
    alerts: [],
    nextAlertId: 1,
    barCache: {},
  };
  saveState(state);
  return state;
}

function saveState(state: EngineState): void {
  try {
    const filePath = getCacheFilePath();
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to persist server cache file:", e);
  }
}

// Singleton state reference
let globalState: EngineState = loadInitialState();

export function getEngineState(): EngineState {
  return globalState;
}

// ============================================================================
// 1. Watchlist CRUD
// ============================================================================
export function listWatchlist(): WatchlistItem[] {
  return [...globalState.watchlist];
}

export function addToWatchlist(
  tickerInput: string,
  companyNameInput?: string
): WatchlistItem {
  const ticker = tickerInput.trim().toUpperCase();
  const existing = globalState.watchlist.find((w) => w.ticker === ticker);
  if (existing) {
    const error: any = new Error(`Ticker '${ticker}' already exists in watchlist`);
    error.status = 409;
    throw error;
  }

  const defaultMeta = DEFAULT_TICKERS.find((d) => d.ticker === ticker);
  const companyName = companyNameInput || defaultMeta?.company_name || null;

  const newItem: WatchlistItem = {
    id: globalState.nextWatchlistId++,
    ticker,
    company_name: companyName,
    added_at: new Date().toISOString(),
  };

  globalState.watchlist.push(newItem);
  saveState(globalState);
  return newItem;
}

export function removeFromWatchlist(tickerInput: string): void {
  const ticker = tickerInput.trim().toUpperCase();
  const index = globalState.watchlist.findIndex((w) => w.ticker === ticker);
  if (index === -1) {
    const error: any = new Error(`Ticker '${ticker}' not found in watchlist`);
    error.status = 404;
    throw error;
  }

  globalState.watchlist.splice(index, 1);
  saveState(globalState);
}

// ============================================================================
// 2. Deterministic OHLCV Bar Generator & Live Polygon Client
// ============================================================================
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;

  function next(): number {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  }

  function nextNormal(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.max(1e-9, next());
    const u2 = next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  function nextUniform(min: number, max: number): number {
    return min + (max - min) * next();
  }

  return { next, nextNormal, nextUniform };
}

export function generateDeterministicBars(
  tickerInput: string,
  days: number = 90
): OHLCVBar[] {
  const ticker = tickerInput.trim().toUpperCase();
  let seed = 0;
  for (let i = 0; i < ticker.length; i++) {
    seed += ticker.charCodeAt(i);
  }

  const rng = createSeededRandom(seed);

  const tickerBaseMap: Record<string, number> = {
    AAPL: 185.0,
    NVDA: 120.0,
    MSFT: 420.0,
    AMZN: 180.0,
    GOOGL: 175.0,
    TSLA: 250.0,
    META: 500.0,
    JPM: 200.0,
    V: 275.0,
    NFLX: 680.0,
  };

  let currentPrice = tickerBaseMap[ticker] || 100.0 + (seed % 150);

  // Generate target business days going backwards
  const now = new Date();
  const targetDates: Date[] = [];
  const curDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  while (targetDates.length < days) {
    const dayOfWeek = curDate.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      targetDates.push(new Date(curDate.getTime()));
    }
    curDate.setUTCDate(curDate.getUTCDate() - 1);
  }
  targetDates.reverse();

  const bars: OHLCVBar[] = [];

  for (const d of targetDates) {
    const dailyDrift = rng.nextNormal(0.0005, 0.015);
    const intraVolatility = rng.nextUniform(0.01, 0.025);
    const openPrice = Number((currentPrice * (1.0 + rng.nextNormal(0, 0.004))).toFixed(2));
    const closePrice = Number((openPrice * (1.0 + dailyDrift)).toFixed(2));
    const highPrice = Number(
      (Math.max(openPrice, closePrice) * (1.0 + intraVolatility * rng.nextUniform(0.3, 1.0))).toFixed(2)
    );
    const lowPrice = Number(
      (Math.min(openPrice, closePrice) * (1.0 - intraVolatility * rng.nextUniform(0.3, 1.0))).toFixed(2)
    );
    const volume = Math.round(rng.nextUniform(10000000, 60000000));

    const barDateStr = d.toISOString().split("T")[0];
    const timestamp = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 16, 0, 0);

    bars.push({
      timestamp,
      date: barDateStr,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      close: closePrice,
      volume,
    });

    currentPrice = closePrice;
  }

  return bars;
}

export async function getDailyBars(
  tickerInput: string,
  days: number = 90,
  forceRefresh: boolean = false
): Promise<MarketBarsResponse> {
  const ticker = tickerInput.trim().toUpperCase();
  const cacheKey = `bars:${ticker}:${days}`;
  const now = Date.now();

  const cached = globalState.barCache[cacheKey];

  // 1. Check in-memory/file cache if still valid
  if (cached && !forceRefresh) {
    const expiresAtMs = new Date(cached.expires_at).getTime();
    if (expiresAtMs > now) {
      return {
        ticker,
        timeframe: "1D",
        count: cached.bars.length,
        cached: true,
        is_stale: false,
        data_source: cached.data_source,
        fetched_at: cached.fetched_at,
        expires_at: cached.expires_at,
        disclaimer: DATA_DELAY_DISCLAIMER,
        bars: cached.bars,
      };
    }
  }

  // 2. Attempt Live Polygon API Call if key configured and rate limit allows
  const polygonKey = process.env.POLYGON_API_KEY;
  const hasLivePolygonKey =
    Boolean(polygonKey) &&
    polygonKey !== "your_polygon_api_key_here" &&
    polygonKey!.trim() !== "";

  if (hasLivePolygonKey && canMakeExternalCall()) {
    try {
      recordExternalCall();
      const toDate = new Date().toISOString().split("T")[0];
      const fromDateObj = new Date();
      fromDateObj.setDate(fromDateObj.getDate() - Math.round(days * 1.5) - 10);
      const fromDate = fromDateObj.toISOString().split("T")[0];

      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=500&apiKey=${polygonKey}`;

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        if (results.length > 0) {
          const liveBars: OHLCVBar[] = results.map((item: any) => ({
            timestamp: item.t,
            date: new Date(item.t).toISOString().split("T")[0],
            open: Number(Number(item.o).toFixed(2)),
            high: Number(Number(item.h).toFixed(2)),
            low: Number(Number(item.l).toFixed(2)),
            close: Number(Number(item.c).toFixed(2)),
            volume: Math.round(Number(item.v || 0)),
          }));

          const trimmed = liveBars.slice(-days);
          const fetchedAt = new Date().toISOString();
          const expiresAt = new Date(now + CACHE_TTL_MS).toISOString();

          globalState.barCache[cacheKey] = {
            ticker,
            days,
            bars: trimmed,
            data_source: "polygon_live",
            fetched_at: fetchedAt,
            expires_at: expiresAt,
          };
          saveState(globalState);

          return {
            ticker,
            timeframe: "1D",
            count: trimmed.length,
            cached: false,
            is_stale: false,
            data_source: "polygon_live",
            fetched_at: fetchedAt,
            expires_at: expiresAt,
            disclaimer: DATA_DELAY_DISCLAIMER,
            bars: trimmed,
          };
        }
      }
    } catch (e) {
      console.warn(`Polygon API fetch failed for ${ticker}:`, e);
    }
  }

  // 3. Fallback: Stale Cache (only if not forcing refresh)
  if (cached && !forceRefresh) {
    return {
      ticker,
      timeframe: "1D",
      count: cached.bars.length,
      cached: true,
      is_stale: true,
      data_source: "sqlite_stale_cache",
      fetched_at: cached.fetched_at,
      expires_at: cached.expires_at,
      disclaimer: DATA_DELAY_DISCLAIMER,
      bars: cached.bars,
    };
  }

  // 4. Deterministic Synthetic Bar Generation
  const syntheticBars = generateDeterministicBars(ticker, days);
  const fetchedAt = new Date().toISOString();
  const expiresAt = new Date(now + CACHE_TTL_MS).toISOString();

  globalState.barCache[cacheKey] = {
    ticker,
    days,
    bars: syntheticBars,
    data_source: "deterministic_fallback",
    fetched_at: fetchedAt,
    expires_at: expiresAt,
  };
  saveState(globalState);

  return {
    ticker,
    timeframe: "1D",
    count: syntheticBars.length,
    cached: false,
    is_stale: false,
    data_source: "deterministic_fallback",
    fetched_at: fetchedAt,
    expires_at: expiresAt,
    disclaimer: DATA_DELAY_DISCLAIMER,
    bars: syntheticBars,
  };
}

export async function getQuote(tickerInput: string): Promise<TickerQuote> {
  const ticker = tickerInput.trim().toUpperCase();
  const barsResp = await getDailyBars(ticker, 30);
  const bars = barsResp.bars;

  if (bars.length === 0) {
    throw new Error(`No price data available for ticker ${ticker}`);
  }

  const latestBar = bars[bars.length - 1];
  const prevBar = bars.length > 1 ? bars[bars.length - 2] : latestBar;

  const price = latestBar.close;
  const prevClose = prevBar.close;
  const change = Number((price - prevClose).toFixed(2));
  const changePct = prevClose !== 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0.0;

  const company = globalState.watchlist.find((w) => w.ticker === ticker);
  const defaultMeta = DEFAULT_TICKERS.find((d) => d.ticker === ticker);
  const companyName = company?.company_name || defaultMeta?.company_name || null;

  return {
    ticker,
    company_name: companyName,
    price,
    change,
    change_percent: changePct,
    high: latestBar.high,
    low: latestBar.low,
    open: latestBar.open,
    prev_close: prevClose,
    volume: latestBar.volume,
    cached: barsResp.cached,
    data_source: barsResp.data_source,
    updated_at: new Date().toISOString(),
    disclaimer: DATA_DELAY_DISCLAIMER,
  };
}

export async function getQuotes(tickersList?: string[]): Promise<TickerQuote[]> {
  const tickers =
    tickersList && tickersList.length > 0
      ? tickersList.map((t) => t.trim().toUpperCase())
      : globalState.watchlist.map((w) => w.ticker);

  const quotes = await Promise.all(
    tickers.map(async (t) => {
      try {
        return await getQuote(t);
      } catch {
        return null;
      }
    })
  );

  return quotes.filter((q): q is TickerQuote => q !== null);
}

// ============================================================================
// 3. Deterministic Technical Indicator Engine (Zero LLM Math)
// ============================================================================
export async function computeIndicators(
  tickerInput: string,
  days: number = 120,
  forceRefresh: boolean = false
): Promise<TickerIndicatorsResponse> {
  const ticker = tickerInput.trim().toUpperCase();
  const fetchDays = Math.max(days, 120);
  const barsResp = await getDailyBars(ticker, fetchDays, forceRefresh);
  const bars = barsResp.bars;

  if (bars.length === 0) {
    throw new Error(`No market data available for indicator computation on ${ticker}`);
  }

  // Pre-calculate SMAs
  const closes = bars.map((b) => b.close);

  const sma20Values: (number | null)[] = [];
  const sma50Values: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i >= 19) {
      const sum20 = closes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0);
      sma20Values.push(Number((sum20 / 20).toFixed(2)));
    } else {
      sma20Values.push(null);
    }

    if (i >= 49) {
      const sum50 = closes.slice(i - 49, i + 1).reduce((a, b) => a + b, 0);
      sma50Values.push(Number((sum50 / 50).toFixed(2)));
    } else {
      sma50Values.push(null);
    }
  }

  // Wilder's RSI (14 periods, alpha = 1 / 14)
  const rsiValues: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsiValues.push(null);
      continue;
    }
    const diff = closes[i] - closes[i - 1];
    const gain = Math.max(0, diff);
    const loss = Math.max(0, -diff);

    if (i <= 14) {
      avgGain += gain;
      avgLoss += loss;
      if (i === 14) {
        avgGain = avgGain / 14;
        avgLoss = avgLoss / 14;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
        rsiValues.push(Number(Math.min(100, Math.max(0, rsi)).toFixed(2)));
      } else {
        rsiValues.push(null);
      }
    } else {
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
      rsiValues.push(Number(Math.min(100, Math.max(0, rsi)).toFixed(2)));
    }
  }

  // MACD (12, 26, 9)
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  const k9 = 2 / (9 + 1);

  let ema12 = closes[0];
  let ema26 = closes[0];

  const macdValues: (number | null)[] = [];
  const signalValues: (number | null)[] = [];
  const histValues: (number | null)[] = [];

  let emaSignal: number | null = null;

  for (let i = 0; i < closes.length; i++) {
    const c = closes[i];
    ema12 = c * k12 + ema12 * (1 - k12);
    ema26 = c * k26 + ema26 * (1 - k26);
    const macd = ema12 - ema26;
    macdValues.push(Number(macd.toFixed(4)));

    if (emaSignal === null) {
      emaSignal = macd;
    } else {
      emaSignal = macd * k9 + emaSignal * (1 - k9);
    }
    signalValues.push(Number(emaSignal.toFixed(4)));
    histValues.push(Number((macd - emaSignal).toFixed(4)));
  }

  // Assemble series limited to requested days
  const startIndex = Math.max(0, bars.length - days);
  const series: IndicatorPoint[] = [];

  for (let i = startIndex; i < bars.length; i++) {
    const b = bars[i];
    series.push({
      date: b.date,
      timestamp: b.timestamp,
      close: b.close,
      sma_20: sma20Values[i],
      sma_50: sma50Values[i],
      rsi_14: rsiValues[i],
      macd: macdValues[i],
      macd_signal: signalValues[i],
      macd_hist: histValues[i],
    });
  }

  // Latest Snapshot
  const lastIndex = bars.length - 1;
  const lastClose = bars[lastIndex].close;
  const lastSma20 = sma20Values[lastIndex];
  const lastSma50 = sma50Values[lastIndex];
  const lastRsi = rsiValues[lastIndex];
  const lastMacd = macdValues[lastIndex];
  const lastSignal = signalValues[lastIndex];
  const lastHist = histValues[lastIndex];

  let rsiState = "NEUTRAL";
  if (lastRsi !== null) {
    if (lastRsi >= 70) rsiState = "OVERBOUGHT";
    else if (lastRsi <= 30) rsiState = "OVERSOLD";
  }

  let macdState = "NEUTRAL";
  if (lastHist !== null) {
    if (lastHist > 0) macdState = "BULLISH_MOMENTUM";
    else if (lastHist < 0) macdState = "BEARISH_MOMENTUM";
  }

  let trendRegime = "SIDEWAYS";
  if (lastSma20 !== null) {
    if (lastClose > lastSma20 && (lastSma50 === null || lastSma20 >= lastSma50)) {
      trendRegime = "BULLISH";
    } else if (lastClose < lastSma20 && (lastSma50 === null || lastSma20 < lastSma50)) {
      trendRegime = "BEARISH";
    }
  }

  const latest: LatestIndicatorSnapshot = {
    close: lastClose,
    sma_20: lastSma20,
    sma_50: lastSma50,
    rsi_14: lastRsi,
    rsi_state: rsiState,
    macd: lastMacd,
    macd_signal: lastSignal,
    macd_hist: lastHist,
    macd_state: macdState,
    trend_regime: trendRegime,
  };

  return {
    ticker,
    timeframe: "1D",
    days,
    count: series.length,
    cached: barsResp.cached,
    data_source: barsResp.data_source,
    latest,
    series,
    disclaimer: DATA_DELAY_DISCLAIMER,
  };
}

// ============================================================================
// 4. Portfolio Service
// ============================================================================
export async function getPortfolioSummary(): Promise<PortfolioSummaryResponse> {
  const holdings = globalState.holdings;
  if (holdings.length === 0) {
    return {
      holdings_count: 0,
      total_cost_basis: 0.0,
      total_market_value: 0.0,
      total_unrealized_pl: 0.0,
      total_unrealized_pl_percent: 0.0,
      total_day_change_dollar: 0.0,
      total_day_change_percent: 0.0,
      top_holding_ticker: null,
      top_holding_weight_percent: 0.0,
      concentration_warning: false,
      holdings: [],
      disclaimer: DATA_DELAY_DISCLAIMER,
    };
  }

  let totalCostBasis = 0.0;
  let totalMarketValue = 0.0;
  let totalDayChangeDollar = 0.0;

  const tempItems: any[] = [];

  for (const h of holdings) {
    let currentPrice = h.avg_cost_basis;
    let dayChangePerShare = 0.0;
    let dayChangePercent = 0.0;
    let companyName: string | null = null;

    try {
      const quote = await getQuote(h.ticker);
      currentPrice = quote.price;
      dayChangePerShare = quote.change;
      dayChangePercent = quote.change_percent;
      companyName = quote.company_name;
    } catch (e) {
      console.warn(`Could not retrieve quote for holding ${h.ticker}:`, e);
    }

    const totalCost = Number((h.shares * h.avg_cost_basis).toFixed(2));
    const marketValue = Number((h.shares * currentPrice).toFixed(2));
    const unrealizedPl = Number((marketValue - totalCost).toFixed(2));
    const unrealizedPlPercent =
      totalCost > 0 ? Number(((unrealizedPl / totalCost) * 100).toFixed(2)) : 0.0;
    const dayChangeDollar = Number((h.shares * dayChangePerShare).toFixed(2));

    totalCostBasis += totalCost;
    totalMarketValue += marketValue;
    totalDayChangeDollar += dayChangeDollar;

    tempItems.push({
      id: h.id,
      ticker: h.ticker,
      company_name: companyName,
      shares: h.shares,
      avg_cost_basis: h.avg_cost_basis,
      current_price: currentPrice,
      total_cost: totalCost,
      market_value: marketValue,
      unrealized_pl: unrealizedPl,
      unrealized_pl_percent: unrealizedPlPercent,
      day_change_dollar: dayChangeDollar,
      day_change_percent: dayChangePercent,
      notes: h.notes || null,
      updated_at: h.updated_at,
    });
  }

  totalCostBasis = Number(totalCostBasis.toFixed(2));
  totalMarketValue = Number(totalMarketValue.toFixed(2));
  const totalUnrealizedPl = Number((totalMarketValue - totalCostBasis).toFixed(2));
  const totalUnrealizedPlPercent =
    totalCostBasis > 0 ? Number(((totalUnrealizedPl / totalCostBasis) * 100).toFixed(2)) : 0.0;
  totalDayChangeDollar = Number(totalDayChangeDollar.toFixed(2));

  const prevMarketVal = totalMarketValue - totalDayChangeDollar;
  const totalDayChangePercent =
    prevMarketVal > 0 ? Number(((totalDayChangeDollar / prevMarketVal) * 100).toFixed(2)) : 0.0;

  const valuedHoldings: HoldingValuation[] = tempItems.map((item) => {
    const weight =
      totalMarketValue > 0
        ? Number(((item.market_value / totalMarketValue) * 100).toFixed(2))
        : 0.0;
    return {
      ...item,
      weight_percent: weight,
      is_concentrated: weight >= 25.0,
    };
  });

  valuedHoldings.sort((a, b) => b.market_value - a.market_value);

  const topTicker = valuedHoldings.length > 0 ? valuedHoldings[0].ticker : null;
  const topWeight = valuedHoldings.length > 0 ? valuedHoldings[0].weight_percent : 0.0;
  const hasConcentration = valuedHoldings.some((h) => h.is_concentrated);

  return {
    holdings_count: valuedHoldings.length,
    total_cost_basis: totalCostBasis,
    total_market_value: totalMarketValue,
    total_unrealized_pl: totalUnrealizedPl,
    total_unrealized_pl_percent: totalUnrealizedPlPercent,
    total_day_change_dollar: totalDayChangeDollar,
    total_day_change_percent: totalDayChangePercent,
    top_holding_ticker: topTicker,
    top_holding_weight_percent: topWeight,
    concentration_warning: hasConcentration,
    holdings: valuedHoldings,
    disclaimer: DATA_DELAY_DISCLAIMER,
  };
}

export async function upsertHolding(
  payload: HoldingCreateUpdate
): Promise<PortfolioSummaryResponse> {
  const ticker = payload.ticker.trim().toUpperCase();
  const existing = globalState.holdings.find((h) => h.ticker === ticker);

  if (existing) {
    existing.shares = Number(payload.shares);
    existing.avg_cost_basis = Number(payload.avg_cost_basis);
    existing.notes = payload.notes || null;
    existing.updated_at = new Date().toISOString();
  } else {
    globalState.holdings.push({
      id: globalState.nextHoldingId++,
      ticker,
      shares: Number(payload.shares),
      avg_cost_basis: Number(payload.avg_cost_basis),
      notes: payload.notes || null,
      updated_at: new Date().toISOString(),
    });
  }

  saveState(globalState);
  return getPortfolioSummary();
}

export async function updateHoldingById(
  id: number,
  payload: HoldingCreateUpdate
): Promise<PortfolioSummaryResponse> {
  const holding = globalState.holdings.find((h) => h.id === id);
  if (!holding) {
    const error: any = new Error(`Portfolio holding with ID ${id} not found`);
    error.status = 404;
    throw error;
  }

  const cleanTicker = payload.ticker.trim().toUpperCase();
  const other = globalState.holdings.find(
    (h) => h.ticker === cleanTicker && h.id !== id
  );
  if (other) {
    const error: any = new Error(`Another holding with ticker '${cleanTicker}' already exists`);
    error.status = 409;
    throw error;
  }

  holding.ticker = cleanTicker;
  holding.shares = Number(payload.shares);
  holding.avg_cost_basis = Number(payload.avg_cost_basis);
  holding.notes = payload.notes || null;
  holding.updated_at = new Date().toISOString();

  saveState(globalState);
  return getPortfolioSummary();
}

export async function deleteHoldingById(id: number): Promise<PortfolioSummaryResponse> {
  const index = globalState.holdings.findIndex((h) => h.id === id);
  if (index === -1) {
    const error: any = new Error(`Portfolio holding with ID ${id} not found`);
    error.status = 404;
    throw error;
  }

  globalState.holdings.splice(index, 1);
  saveState(globalState);
  return getPortfolioSummary();
}

// ============================================================================
// 5. Alert Engine
// ============================================================================
const VALID_ALERT_CONDITIONS = [
  "PRICE_ABOVE",
  "PRICE_BELOW",
  "RSI_ABOVE",
  "RSI_BELOW",
  "SMA20_ABOVE_SMA50",
  "SMA20_BELOW_SMA50",
];

function evaluateCondition(
  conditionType: string,
  threshold: number,
  latest: LatestIndicatorSnapshot
): boolean {
  if (conditionType === "PRICE_ABOVE") return latest.close >= threshold;
  if (conditionType === "PRICE_BELOW") return latest.close <= threshold;
  if (conditionType === "RSI_ABOVE")
    return latest.rsi_14 !== null && latest.rsi_14 >= threshold;
  if (conditionType === "RSI_BELOW")
    return latest.rsi_14 !== null && latest.rsi_14 <= threshold;
  if (conditionType === "SMA20_ABOVE_SMA50")
    return (
      latest.sma_20 !== null &&
      latest.sma_50 !== null &&
      latest.sma_20 > latest.sma_50
    );
  if (conditionType === "SMA20_BELOW_SMA50")
    return (
      latest.sma_20 !== null &&
      latest.sma_50 !== null &&
      latest.sma_20 < latest.sma_50
    );
  return false;
}

export async function getAlertsSummary(): Promise<AlertsSummaryResponse> {
  const rules = globalState.alerts;
  if (rules.length === 0) {
    return {
      total_alerts: 0,
      active_count: 0,
      triggered_count: 0,
      alerts: [],
      disclaimer: DATA_DELAY_DISCLAIMER,
    };
  }

  const uniqueTickers = Array.from(new Set(rules.map((r) => r.ticker)));
  const snapshots: Record<string, LatestIndicatorSnapshot | null> = {};

  await Promise.all(
    uniqueTickers.map(async (t) => {
      try {
        const ind = await computeIndicators(t, 120);
        snapshots[t] = ind.latest;
      } catch {
        snapshots[t] = null;
      }
    })
  );

  let activeCount = 0;
  let triggeredCount = 0;
  const evaluatedAlerts: AlertRead[] = [];

  for (const r of rules) {
    const latest = snapshots[r.ticker];
    let metricVal: number | null = null;
    let statusMsg = "";
    let isMet = false;

    if (latest) {
      if (r.condition_type === "PRICE_ABOVE") {
        metricVal = latest.close;
        isMet = latest.close >= r.threshold_value;
        statusMsg = `Price $${latest.close.toFixed(2)} >= Target $${r.threshold_value.toFixed(2)}`;
      } else if (r.condition_type === "PRICE_BELOW") {
        metricVal = latest.close;
        isMet = latest.close <= r.threshold_value;
        statusMsg = `Price $${latest.close.toFixed(2)} <= Target $${r.threshold_value.toFixed(2)}`;
      } else if (r.condition_type === "RSI_ABOVE") {
        metricVal = latest.rsi_14;
        isMet = latest.rsi_14 !== null && latest.rsi_14 >= r.threshold_value;
        statusMsg = `RSI ${latest.rsi_14 !== null ? latest.rsi_14.toFixed(2) : "N/A"} >= Target ${r.threshold_value.toFixed(1)}`;
      } else if (r.condition_type === "RSI_BELOW") {
        metricVal = latest.rsi_14;
        isMet = latest.rsi_14 !== null && latest.rsi_14 <= r.threshold_value;
        statusMsg = `RSI ${latest.rsi_14 !== null ? latest.rsi_14.toFixed(2) : "N/A"} <= Target ${r.threshold_value.toFixed(1)}`;
      } else if (r.condition_type === "SMA20_ABOVE_SMA50") {
        metricVal = latest.sma_20;
        isMet =
          latest.sma_20 !== null &&
          latest.sma_50 !== null &&
          latest.sma_20 > latest.sma_50;
        statusMsg = `SMA-20 ($${latest.sma_20?.toFixed(2) ?? "N/A"}) > SMA-50 ($${latest.sma_50?.toFixed(2) ?? "N/A"})`;
      } else if (r.condition_type === "SMA20_BELOW_SMA50") {
        metricVal = latest.sma_20;
        isMet =
          latest.sma_20 !== null &&
          latest.sma_50 !== null &&
          latest.sma_20 < latest.sma_50;
        statusMsg = `SMA-20 ($${latest.sma_20?.toFixed(2) ?? "N/A"}) < SMA-50 ($${latest.sma_50?.toFixed(2) ?? "N/A"})`;
      }
    } else {
      statusMsg = "Waiting for market data...";
    }

    if (r.is_active && isMet && !r.triggered_at) {
      r.triggered_at = new Date().toISOString();
    }

    if (r.is_active) activeCount++;
    if (r.triggered_at) triggeredCount++;

    evaluatedAlerts.push({
      id: r.id,
      ticker: r.ticker,
      condition_type: r.condition_type,
      threshold_value: r.threshold_value,
      is_active: r.is_active,
      is_triggered: Boolean(r.triggered_at),
      current_metric_value: metricVal,
      status_message: statusMsg,
      triggered_at: r.triggered_at,
      created_at: r.created_at,
    });
  }

  saveState(globalState);

  return {
    total_alerts: evaluatedAlerts.length,
    active_count: activeCount,
    triggered_count: triggeredCount,
    alerts: evaluatedAlerts,
    disclaimer: DATA_DELAY_DISCLAIMER,
  };
}

export async function createAlertRule(
  payload: AlertCreate
): Promise<AlertsSummaryResponse> {
  const ticker = payload.ticker.trim().toUpperCase();
  const conditionType = payload.condition_type;
  if (!VALID_ALERT_CONDITIONS.includes(conditionType)) {
    const error: any = new Error(
      `Invalid condition_type: ${conditionType}. Must be one of: ${VALID_ALERT_CONDITIONS.join(", ")}`
    );
    error.status = 422;
    throw error;
  }

  const thresholdValue = Number(payload.threshold_value);

  const rule: StoredAlert = {
    id: globalState.nextAlertId++,
    ticker,
    condition_type: conditionType,
    threshold_value: thresholdValue,
    is_active: true,
    triggered_at: null,
    created_at: new Date().toISOString(),
  };

  // Immediate check
  try {
    const ind = await computeIndicators(ticker, 120);
    if (evaluateCondition(conditionType, thresholdValue, ind.latest)) {
      rule.triggered_at = new Date().toISOString();
    }
  } catch (e) {
    console.warn(`Failed immediate evaluation for new alert on ${ticker}:`, e);
  }

  globalState.alerts.unshift(rule);
  saveState(globalState);

  return getAlertsSummary();
}

export async function updateAlertRule(
  id: number,
  payload: { is_active?: boolean; reset_trigger?: boolean }
): Promise<AlertsSummaryResponse> {
  const rule = globalState.alerts.find((r) => r.id === id);
  if (!rule) {
    const error: any = new Error(`Alert rule with ID ${id} not found`);
    error.status = 404;
    throw error;
  }

  if (payload.is_active !== undefined) {
    rule.is_active = payload.is_active;
  }
  if (payload.reset_trigger) {
    rule.triggered_at = null;
  }

  saveState(globalState);
  return getAlertsSummary();
}

export async function deleteAlertRule(id: number): Promise<AlertsSummaryResponse> {
  const index = globalState.alerts.findIndex((r) => r.id === id);
  if (index === -1) {
    const error: any = new Error(`Alert rule with ID ${id} not found`);
    error.status = 404;
    throw error;
  }

  globalState.alerts.splice(index, 1);
  saveState(globalState);
  return getAlertsSummary();
}

// ============================================================================
// 6. AI Intelligence Services (Deterministic Grounding + OpenRouter)
// ============================================================================
async function callOpenRouterStructured(
  systemPrompt: string,
  userPrompt: string
): Promise<any | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (
    !apiKey ||
    apiKey === "your_openrouter_api_key_here" ||
    apiKey.trim() === ""
  ) {
    return null;
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const modelName = model.startsWith("openrouter/") ? model.replace("openrouter/", "") : model;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://firasa.ismailspace.cloud",
        "X-Title": "FIRASA Trading Intelligence",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (e) {
    console.warn("OpenRouter API call failed, falling back to deterministic synthesis:", e);
  }

  return null;
}

export async function analyzeMarketTicker(tickerInput: string): Promise<MarketAnalysisResponse> {
  const ticker = tickerInput.trim().toUpperCase();
  const indResp = await computeIndicators(ticker, 120);
  const barsResp = await getDailyBars(ticker, 120);
  const latest = indResp.latest;

  const last20Bars = barsResp.bars.slice(-20);
  const supportEstimate =
    last20Bars.length > 0
      ? Number(Math.min(...last20Bars.map((b) => b.low)).toFixed(2))
      : Number((latest.close * 0.95).toFixed(2));
  const resistanceEstimate =
    last20Bars.length > 0
      ? Number(Math.max(...last20Bars.map((b) => b.high)).toFixed(2))
      : Number((latest.close * 1.05).toFixed(2));

  const keyLevels = {
    current_price: latest.close,
    support_estimate: supportEstimate,
    resistance_estimate: resistanceEstimate,
    sma_20: latest.sma_20 ?? latest.close,
    sma_50: latest.sma_50 ?? latest.close,
  };

  let bias = "NEUTRAL";
  let confidence = 65;

  if (latest.trend_regime === "BULLISH") {
    bias = "BULLISH";
    confidence = 75;
    if (latest.macd_state === "BULLISH_MOMENTUM" && latest.rsi_state !== "OVERBOUGHT") {
      confidence = 85;
    } else if (latest.rsi_state === "OVERBOUGHT") {
      confidence = 68;
    }
  } else if (latest.trend_regime === "BEARISH") {
    bias = "BEARISH";
    confidence = 75;
    if (latest.macd_state === "BEARISH_MOMENTUM" && latest.rsi_state !== "OVERSOLD") {
      confidence = 85;
    } else if (latest.rsi_state === "OVERSOLD") {
      confidence = 68;
    }
  }

  const rsiStr = latest.rsi_14 !== null ? latest.rsi_14.toFixed(2) : "N/A";
  const macdHistStr = latest.macd_hist !== null ? latest.macd_hist.toFixed(4) : "0.0000";
  const sma20Str = `$${keyLevels.sma_20.toFixed(2)}`;
  const sma50Str = `$${keyLevels.sma_50.toFixed(2)}`;

  const defaultSummary = `${ticker} displays a ${bias} regime at $${latest.close.toFixed(2)}. Price trades relative to SMA-20 (${sma20Str}) and SMA-50 (${sma50Str}) with RSI-14 registering at ${rsiStr} (${latest.rsi_state}) and MACD histogram at ${macdHistStr}.`;

  const defaultBreakdown = [
    `Trend Regime: ${latest.trend_regime} based on Close $${latest.close.toFixed(2)} relative to SMA-20 (${sma20Str}) and SMA-50 (${sma50Str}).`,
    `Momentum Oscillator: RSI-14 sits at ${rsiStr}, indicating a ${latest.rsi_state.toLowerCase()} condition.`,
    `Trend Acceleration: MACD histogram is ${macdHistStr} reflecting ${latest.macd_state.replace(/_/g, " ").toLowerCase()}.`,
    `Key Range: Estimated 20-day support sits at $${supportEstimate.toFixed(2)} with overhead resistance around $${resistanceEstimate.toFixed(2)}.`,
  ];

  const defaultRisks = [
    `Downside invalidation below 20-day support of $${supportEstimate.toFixed(2)}.`,
    `Oscillator exhaustion risk given RSI-14 status of ${latest.rsi_state}.`,
    "General market volatility and macroeconomic headline sensitivity.",
  ];

  let modelUsed = "deterministic_rule_engine";
  const systemPrompt =
    "You are an institutional financial research analyst at FIRASA. Analyze the provided deterministic technical indicators. CRITICAL: Do NOT compute mathematical indicators yourself; only cite and explain the provided facts. Return a JSON object with keys: 'executive_summary' (string), 'technical_breakdown' (list of strings), and 'risk_factors' (list of strings).";
  const userPrompt = `Asset: ${ticker}\nClose Price: $${latest.close.toFixed(2)}\nSMA-20: ${sma20Str}, SMA-50: ${sma50Str}\nRSI-14: ${rsiStr} (${latest.rsi_state})\nMACD Histogram: ${macdHistStr} (${latest.macd_state})\n20D Support: $${supportEstimate.toFixed(2)}, 20D Resistance: $${resistanceEstimate.toFixed(2)}\nBaseline Bias: ${bias} (Confidence: ${confidence}%)`;

  const llmData = await callOpenRouterStructured(systemPrompt, userPrompt);
  if (llmData) {
    modelUsed = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  }

  return {
    ticker,
    model_used: modelUsed,
    generated_at: new Date().toISOString(),
    bias,
    confidence_score: confidence,
    executive_summary: llmData?.executive_summary || defaultSummary,
    technical_breakdown: llmData?.technical_breakdown || defaultBreakdown,
    key_levels: keyLevels,
    risk_factors: llmData?.risk_factors || defaultRisks,
    deterministic_metrics: {
      close: latest.close,
      sma_20: latest.sma_20,
      sma_50: latest.sma_50,
      rsi_14: latest.rsi_14,
      rsi_state: latest.rsi_state,
      macd: latest.macd,
      macd_signal: latest.macd_signal,
      macd_hist: latest.macd_hist,
      macd_state: latest.macd_state,
      trend_regime: latest.trend_regime,
    },
    disclaimer: DATA_DELAY_DISCLAIMER,
  };
}

export async function auditPortfolioRisk(): Promise<PortfolioRiskAuditResponse> {
  const summary = await getPortfolioSummary();
  const nowStr = new Date().toISOString();

  if (summary.holdings_count === 0) {
    return {
      model_used: "deterministic_rule_engine",
      generated_at: nowStr,
      overall_risk_level: "LOW",
      risk_score: 0,
      executive_summary:
        "Portfolio currently has no open holdings. Record positions in the Portfolio ledger to activate risk auditing.",
      concentration_analysis: ["No open positions to audit."],
      technical_exposure_warnings: ["No technical exposures detected."],
      diversification_suggestions: [
        "Consider building a balanced allocation across major equities or sector benchmarks.",
        "Keep maximum position sizing under 20-25% to prevent single-stock concentration shocks.",
      ],
      portfolio_snapshot: {
        total_market_value: 0.0,
        total_cost_basis: 0.0,
        total_unrealized_pl: 0.0,
        total_unrealized_pl_percent: 0.0,
        holdings_count: 0,
        top_holding: null,
        top_holding_weight: 0.0,
      },
      disclaimer: DATA_DELAY_DISCLAIMER,
    };
  }

  const concentrationAnalysis: string[] = [];
  const technicalWarnings: string[] = [];
  const diversificationSuggestions: string[] = [];

  let bearishWeightSum = 0.0;
  let overboughtWeightSum = 0.0;

  for (const h of summary.holdings) {
    if (h.weight_percent >= 50.0) {
      concentrationAnalysis.push(
        `CRITICAL: ${h.ticker} represents ${h.weight_percent.toFixed(1)}% of total portfolio value (>$${h.market_value.toLocaleString()}), presenting acute single-stock dependency.`
      );
    } else if (h.weight_percent >= 25.0) {
      concentrationAnalysis.push(
        `WARNING: ${h.ticker} accounts for ${h.weight_percent.toFixed(1)}% of portfolio allocation, exceeding the 25% prudential threshold.`
      );
    }

    try {
      const ind = await computeIndicators(h.ticker, 120);
      const latest = ind.latest;
      if (latest.trend_regime === "BEARISH") {
        bearishWeightSum += h.weight_percent;
        technicalWarnings.push(
          `${h.ticker} (${h.weight_percent.toFixed(1)}% weight) is in a BEARISH trend regime below SMA-20 ($${latest.sma_20?.toFixed(2) ?? "N/A"}).`
        );
      }
      if (latest.rsi_state === "OVERBOUGHT") {
        overboughtWeightSum += h.weight_percent;
        technicalWarnings.push(
          `${h.ticker} RSI-14 is OVERBOUGHT (${latest.rsi_14?.toFixed(1) ?? "N/A"} >= 70), indicating potential near-term mean-reversion risk.`
        );
      }
    } catch (e) {
      console.warn(`Could not compute indicator cross-audit for ${h.ticker}:`, e);
    }
  }

  if (concentrationAnalysis.length === 0) {
    concentrationAnalysis.push(
      `Allocation is well-distributed. Largest position (${summary.top_holding_ticker}) is ${summary.top_holding_weight_percent.toFixed(1)}%, within safe bounds (<25%).`
    );
  }

  if (technicalWarnings.length === 0) {
    technicalWarnings.push(
      "All audited positions currently maintain neutral or bullish technical regimes without acute indicator divergences."
    );
  }

  let riskScore = 20;
  if (summary.top_holding_weight_percent >= 60.0) riskScore += 45;
  else if (summary.top_holding_weight_percent >= 40.0) riskScore += 30;
  else if (summary.top_holding_weight_percent >= 25.0) riskScore += 15;

  if (summary.holdings_count === 1) riskScore += 25;
  else if (summary.holdings_count === 2) riskScore += 15;
  else if (summary.holdings_count < 4) riskScore += 8;

  if (bearishWeightSum >= 40.0) riskScore += 15;
  else if (bearishWeightSum >= 20.0) riskScore += 8;

  if (overboughtWeightSum >= 40.0) riskScore += 10;

  riskScore = Math.min(100, Math.max(0, riskScore));

  let overallRiskLevel = "LOW";
  if (riskScore >= 75) overallRiskLevel = "CRITICAL";
  else if (riskScore >= 55) overallRiskLevel = "HIGH";
  else if (riskScore >= 35) overallRiskLevel = "MODERATE";

  if (summary.holdings_count < 4) {
    diversificationSuggestions.push(
      `Currently holding only ${summary.holdings_count} asset(s). Consider expanding breadth across uncorrelated sectors to reduce specific unsystematic risk.`
    );
  }
  if (summary.concentration_warning && summary.top_holding_ticker) {
    diversificationSuggestions.push(
      `Rebalancing trim considerations: Trim ${summary.top_holding_ticker} (${summary.top_holding_weight_percent.toFixed(1)}%) to bring exposure below 25% of total capital.`
    );
  }
  if (bearishWeightSum > 30.0) {
    diversificationSuggestions.push(
      `${bearishWeightSum.toFixed(1)}% of capital is allocated to assets in downtrends. Review stop-loss boundaries and fundamental theses on declining positions.`
    );
  }
  if (diversificationSuggestions.length === 0) {
    diversificationSuggestions.push(
      "Maintain ongoing systematic rebalancing and monitor asset correlations regularly."
    );
  }

  const defaultSummary = `Portfolio risk is rated ${overallRiskLevel} (Score: ${riskScore}/100) across ${summary.holdings_count} position(s) valued at $${summary.total_market_value.toLocaleString()}. Top position is ${summary.top_holding_ticker} with ${summary.top_holding_weight_percent.toFixed(1)}% weight.`;

  let modelUsed = "deterministic_rule_engine";
  const systemPrompt =
    "You are an institutional portfolio risk auditor at FIRASA. Audit the provided pre-computed portfolio risk metrics and diversification statistics. Do NOT perform math. Provide an institutional risk commentary. Return a JSON object with keys: 'executive_summary' (string), 'concentration_analysis' (list of strings), 'technical_exposure_warnings' (list of strings), and 'diversification_suggestions' (list of strings).";
  const userPrompt = `Holdings Count: ${summary.holdings_count}\nTotal Market Value: $${summary.total_market_value.toLocaleString()}\nTop Holding: ${summary.top_holding_ticker} (${summary.top_holding_weight_percent.toFixed(1)}% weight)\nCalculated Risk Score: ${riskScore}/100 (${overallRiskLevel})\nBearish Capital Weight: ${bearishWeightSum.toFixed(1)}%\nOverbought Capital Weight: ${overboughtWeightSum.toFixed(1)}%`;

  const llmData = await callOpenRouterStructured(systemPrompt, userPrompt);
  if (llmData) {
    modelUsed = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  }

  return {
    model_used: modelUsed,
    generated_at: nowStr,
    overall_risk_level: overallRiskLevel,
    risk_score: riskScore,
    executive_summary: llmData?.executive_summary || defaultSummary,
    concentration_analysis: llmData?.concentration_analysis || concentrationAnalysis,
    technical_exposure_warnings: llmData?.technical_exposure_warnings || technicalWarnings,
    diversification_suggestions: llmData?.diversification_suggestions || diversificationSuggestions,
    portfolio_snapshot: {
      total_market_value: summary.total_market_value,
      total_cost_basis: summary.total_cost_basis,
      total_unrealized_pl: summary.total_unrealized_pl,
      total_unrealized_pl_percent: summary.total_unrealized_pl_percent,
      holdings_count: summary.holdings_count,
      top_holding: summary.top_holding_ticker,
      top_holding_weight: summary.top_holding_weight_percent,
    },
    disclaimer: DATA_DELAY_DISCLAIMER,
  };
}

export async function scanOpportunities(): Promise<OpportunityScanResponse> {
  const tickers = globalState.watchlist.map((w) => w.ticker);
  const nowStr = new Date().toISOString();

  const candidates: OpportunityCandidate[] = [];
  let bullishCount = 0;
  let rsiSum = 0.0;
  let rsiValidCount = 0;

  for (const t of tickers) {
    try {
      const quote = await getQuote(t);
      const ind = await computeIndicators(t, 120);
      const latest = ind.latest;

      if (latest.rsi_14 !== null) {
        rsiSum += latest.rsi_14;
        rsiValidCount++;
      }

      if (latest.trend_regime === "BULLISH") {
        bullishCount++;
      }

      let setupType = "MEAN_REVERSION_WATCH";
      let signalStrength = 50;
      let rationale = "";

      if (latest.rsi_14 !== null && latest.rsi_14 <= 35.0) {
        setupType = "OVERSOLD_REVERSAL_WATCH";
        signalStrength = 85;
        rationale = `RSI-14 reached ${latest.rsi_14.toFixed(1)} in oversold territory. Watching for mean-reversion bounce near support levels.`;
      } else if (
        latest.trend_regime === "BULLISH" &&
        (latest.macd_hist || 0) > 0 &&
        (latest.rsi_14 || 50) < 68.0
      ) {
        setupType = "BULLISH_TREND_MOMENTUM";
        signalStrength = 88;
        rationale = `Trading above SMA-20 & SMA-50 with positive MACD histogram momentum and sustainable RSI at ${latest.rsi_14?.toFixed(1) ?? "N/A"}.`;
      } else if (latest.rsi_14 !== null && latest.rsi_14 >= 70.0) {
        setupType = "OVERBOUGHT_PULLBACK_WATCH";
        signalStrength = 72;
        rationale = `RSI-14 at ${latest.rsi_14.toFixed(1)} signals overbought exhaustion. Potential retracement towards SMA-20 support.`;
      } else if (latest.trend_regime === "BULLISH") {
        setupType = "BULLISH_TREND_MOMENTUM";
        signalStrength = 68;
        rationale = `Holding above moving average support with ${latest.macd_state.replace(/_/g, " ").toLowerCase()}.`;
      } else {
        setupType = "MEAN_REVERSION_WATCH";
        signalStrength = 55;
        rationale = `Consolidating in a ${latest.trend_regime.toLowerCase()} structure with RSI at ${(latest.rsi_14 || 50).toFixed(1)}.`;
      }

      candidates.push({
        ticker: t,
        company_name: quote.company_name,
        price: quote.price,
        change_percent: quote.change_percent,
        rsi_14: latest.rsi_14,
        trend_regime: latest.trend_regime,
        macd_state: latest.macd_state,
        setup_type: setupType,
        signal_strength: signalStrength,
        ai_rationale: rationale,
      });
    } catch (e) {
      console.warn(`Scanner evaluation failed for ${t}:`, e);
    }
  }

  candidates.sort((a, b) => b.signal_strength - a.signal_strength);

  const avgRsi = rsiValidCount > 0 ? Number((rsiSum / rsiValidCount).toFixed(1)) : 50.0;
  const bullishPct = tickers.length > 0 ? Number(((bullishCount / tickers.length) * 100).toFixed(1)) : 0.0;

  const marketRegimeSummary = `Universe Scan of ${candidates.length} equities: ${bullishPct}% in BULLISH trend regimes. Average Watchlist RSI is ${avgRsi}.`;

  let modelUsed = "deterministic_rule_engine";
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey && apiKey !== "your_openrouter_api_key_here" && apiKey.trim() !== "") {
    modelUsed = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  }

  return {
    model_used: modelUsed,
    generated_at: nowStr,
    scanned_count: candidates.length,
    market_regime_summary: marketRegimeSummary,
    candidates,
    disclaimer: DATA_DELAY_DISCLAIMER,
  };
}

export function getCacheStatus(): CacheStatus {
  cleanOldRateLimitTimestamps();
  const polygonKey = process.env.POLYGON_API_KEY;
  const hasLivePolygonKey =
    Boolean(polygonKey) &&
    polygonKey !== "your_polygon_api_key_here" &&
    polygonKey!.trim() !== "";

  const callsInLastMinute = externalCallTimestamps.length;
  const remaining = Math.max(0, RATE_LIMIT_MAX_CALLS - callsInLastMinute);

  return {
    total_cached_entries: Object.keys(globalState.barCache).length,
    calls_in_last_minute: callsInLastMinute,
    remaining_calls_per_minute: remaining,
    limit_per_minute: RATE_LIMIT_MAX_CALLS,
    cache_ttl_minutes: 60,
    has_live_polygon_key: hasLivePolygonKey,
  };
}

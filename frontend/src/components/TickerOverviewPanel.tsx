import React, { useState } from "react";
import {
  TickerQuote,
  MarketBarsResponse,
  TickerIndicatorsResponse,
} from "@/types/market";
import { TradingViewChart } from "@/components/TradingViewChart";
import {
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Compass,
  Gauge,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface TickerOverviewPanelProps {
  ticker: string;
  quote: TickerQuote | null;
  barsData: MarketBarsResponse | null;
  indicators: TickerIndicatorsResponse | null;
  days: number;
  onDaysChange: (days: number) => void;
  onRefresh: () => void;
  loading: boolean;
  onOpenAIAnalysis?: (ticker: string) => void;
  tickDirection?: "up" | "down" | "flat";
}

export const TickerOverviewPanel: React.FC<TickerOverviewPanelProps> = ({
  ticker,
  quote,
  barsData,
  indicators,
  days,
  onDaysChange,
  onRefresh,
  loading,
  onOpenAIAnalysis,
  tickDirection = "flat",
}) => {


  const [showRecentBars, setShowRecentBars] = useState<boolean>(false);
  const isPositive = quote ? quote.change >= 0 : true;
  const latest = indicators?.latest;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Institutional Ticker Header */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-white tracking-wide">
              {ticker}
            </h1>
            <span className="text-sm text-terminal-muted font-mono truncate max-w-xs">
              {quote?.company_name || "Equity Asset"}
            </span>
            {quote && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300">
                {quote.data_source}
              </span>
            )}
          </div>
          <p className="text-xs text-terminal-muted/70 mt-0.5 font-mono">
            US Equities — Daily Aggregate Resolution
          </p>
        </div>

        {/* Price & Actions */}
        <div className="flex items-center gap-5">
          <div className="text-left sm:text-right font-mono">
            <div
              className={`text-2xl font-bold tracking-tight transition-all duration-500 px-1.5 py-0.5 rounded inline-block ${
                tickDirection === "up"
                  ? "text-emerald-400 bg-emerald-500/20 scale-[1.02]"
                  : tickDirection === "down"
                  ? "text-rose-400 bg-rose-500/20 scale-[0.98]"
                  : "text-white"
              }`}
            >
              {quote ? `$${quote.price.toFixed(2)}` : "—"}
            </div>
            {quote ? (
              <div
                className={`text-xs flex items-center sm:justify-end gap-1 font-semibold ${
                  isPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
                  {quote.change_percent.toFixed(2)}%)
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Loading quote...</span>
            )}
          </div>

          {onOpenAIAnalysis && (
            <button
              onClick={() => onOpenAIAnalysis(ticker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-mono transition-colors shadow-sm"
              title="Open AI Market Analysis for this ticker"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">AI Analysis</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded border border-terminal-border bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-400 transition-colors disabled:opacity-50"
            title="Force refresh ticker data"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4-Card Deterministic Technical Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        {/* 1. Trend Regime */}
        <div className="bg-terminal-panel border border-terminal-border rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-[11px]">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>TREND REGIME</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                latest?.trend_regime === "BULLISH"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : latest?.trend_regime === "BEARISH"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {latest?.trend_regime || "SIDEWAYS"}
            </span>
          </div>
          <div className="mt-2 text-slate-200">
            Spread:{" "}
            <span className="font-semibold">
              {latest?.sma_20 && latest?.sma_50
                ? (latest.sma_20 - latest.sma_50 >= 0 ? "+" : "") +
                  (latest.sma_20 - latest.sma_50).toFixed(2)
                : "—"}
            </span>{" "}
            (SMA20 - SMA50)
          </div>
        </div>

        {/* 2. RSI (14) */}
        <div className="bg-terminal-panel border border-terminal-border rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-[11px]">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-purple-400" />
              <span>RSI (14-DAY)</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                latest?.rsi_state === "OVERBOUGHT"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : latest?.rsi_state === "OVERSOLD"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-purple-300 border border-purple-500/30"
              }`}
            >
              {latest?.rsi_state || "NEUTRAL"}
            </span>
          </div>
          <div className="mt-2 text-slate-200 text-sm font-semibold">
            {latest?.rsi_14 !== null && latest?.rsi_14 !== undefined
              ? latest.rsi_14.toFixed(2)
              : "—"}{" "}
            <span className="text-[11px] font-normal text-slate-400">
              (70 OB / 30 OS)
            </span>
          </div>
        </div>

        {/* 3. MACD Momentum */}
        <div className="bg-terminal-panel border border-terminal-border rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-[11px]">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>MACD (12,26,9)</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                latest?.macd_state?.includes("BULLISH")
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : latest?.macd_state?.includes("BEARISH")
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {latest?.macd_state || "NEUTRAL"}
            </span>
          </div>
          <div className="mt-2 text-slate-200">
            Hist:{" "}
            <span
              className={`font-semibold ${
                latest?.macd_hist && latest.macd_hist >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {latest?.macd_hist !== null && latest?.macd_hist !== undefined
                ? latest.macd_hist.toFixed(3)
                : "—"}
            </span>
          </div>
        </div>

        {/* 4. Moving Averages */}
        <div className="bg-terminal-panel border border-terminal-border rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-[11px]">
            <span>MOVING AVERAGES</span>
            <span className="text-[10px] text-sky-400">DETERMINISTIC</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-slate-200">
            <span>
              SMA20:{" "}
              <span className="text-sky-400 font-semibold">
                {latest?.sma_20 ? `$${latest.sma_20.toFixed(2)}` : "—"}
              </span>
            </span>
            <span>
              SMA50:{" "}
              <span className="text-amber-400 font-semibold">
                {latest?.sma_50 ? `$${latest.sma_50.toFixed(2)}` : "—"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive TradingView Chart Container */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
        <TradingViewChart
          ticker={ticker}
          bars={barsData?.bars || []}
          indicators={indicators}
          days={days}
          onDaysChange={onDaysChange}
          loading={loading}
        />
      </div>

      {/* 6-Card OHLCV Telemetry Strip & Collapsible Recent Bars */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <div className="bg-terminal-panel border border-terminal-border rounded p-2.5">
            <div className="text-[10px] text-terminal-muted uppercase">Open</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {quote ? `$${quote.open.toFixed(2)}` : "—"}
            </div>
          </div>

          <div className="bg-terminal-panel border border-terminal-border rounded p-2.5">
            <div className="text-[10px] text-terminal-muted uppercase">High</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {quote ? `$${quote.high.toFixed(2)}` : "—"}
            </div>
          </div>

          <div className="bg-terminal-panel border border-terminal-border rounded p-2.5">
            <div className="text-[10px] text-terminal-muted uppercase">Low</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {quote ? `$${quote.low.toFixed(2)}` : "—"}
            </div>
          </div>

          <div className="bg-terminal-panel border border-terminal-border rounded p-2.5">
            <div className="text-[10px] text-terminal-muted uppercase">Prev Close</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {quote ? `$${quote.prev_close.toFixed(2)}` : "—"}
            </div>
          </div>

          <div className="bg-terminal-panel border border-terminal-border rounded p-2.5">
            <div className="text-[10px] text-terminal-muted uppercase">Volume</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {quote ? Number(quote.volume).toLocaleString() : "—"}
            </div>
          </div>

          <div className="bg-terminal-panel border border-terminal-border rounded p-2.5">
            <div className="text-[10px] text-terminal-muted uppercase">Cache TTL</div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" />
              <span>{quote?.cached ? "60M HIT" : "FETCHED"}</span>
            </div>
          </div>
        </div>

        {/* Collapsible Recent Bars Monospace Table */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg">
          <button
            onClick={() => setShowRecentBars(!showRecentBars)}
            className="w-full flex items-center justify-between p-3 text-xs font-mono text-slate-300 hover:text-white"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>
                RECENT OHLCV BARS ({barsData?.bars?.length || 0} TOTAL)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-terminal-muted">
              <span>{showRecentBars ? "Hide" : "Show"} Monospace Table</span>
              {showRecentBars ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {showRecentBars && (
            <div className="p-3 border-t border-terminal-border overflow-x-auto max-h-[220px]">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="sticky top-0 bg-slate-900 text-terminal-muted border-b border-slate-800">
                  <tr>
                    <th className="py-1 px-2">DATE</th>
                    <th className="py-1 px-2 text-right">OPEN</th>
                    <th className="py-1 px-2 text-right">HIGH</th>
                    <th className="py-1 px-2 text-right">LOW</th>
                    <th className="py-1 px-2 text-right">CLOSE</th>
                    <th className="py-1 px-2 text-right">VOLUME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {barsData?.bars?.length ? (
                    barsData.bars.slice(-15).reverse().map((bar) => {
                      const isUp = bar.close >= bar.open;
                      return (
                        <tr key={bar.timestamp} className="hover:bg-slate-800/40">
                          <td className="py-1 px-2 text-slate-400">{bar.date}</td>
                          <td className="py-1 px-2 text-right">${bar.open.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right text-slate-300">
                            ${bar.high.toFixed(2)}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-400">
                            ${bar.low.toFixed(2)}
                          </td>
                          <td
                            className={`py-1 px-2 text-right font-semibold ${
                              isUp ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            ${bar.close.toFixed(2)}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-400">
                            {Number(bar.volume).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        No bar data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

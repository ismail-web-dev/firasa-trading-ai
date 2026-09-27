"use client";

import React, { useState } from "react";
import {
  PortfolioSummaryResponse,
  HoldingValuation,
  HoldingCreateUpdate,
} from "@/types/market";
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  BarChart2,
  PieChart,
  Save,
  X,
  ShieldAlert,
  Zap,
} from "lucide-react";

interface PortfolioPanelProps {
  portfolio: PortfolioSummaryResponse | null;
  onSaveHolding: (payload: HoldingCreateUpdate) => Promise<void>;
  onUpdateHolding: (id: number, payload: HoldingCreateUpdate) => Promise<void>;
  onDeleteHolding: (id: number) => Promise<void>;
  onSelectTicker: (ticker: string) => void;
  loading: boolean;
}

export const PortfolioPanel: React.FC<PortfolioPanelProps> = ({
  portfolio,
  onSaveHolding,
  onUpdateHolding,
  onDeleteHolding,
  onSelectTicker,
  loading,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState<string>("");
  const [avgCost, setAvgCost] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isTotalPlPositive = (portfolio?.total_unrealized_pl || 0) >= 0;
  const isDayPlPositive = (portfolio?.total_day_change_dollar || 0) >= 0;

  const handleLoadDemoPortfolio = async () => {
    try {
      setIsSeedingDemo(true);
      setErrorMsg(null);
      const demoHoldings: HoldingCreateUpdate[] = [
        {
          ticker: "NVDA",
          shares: 25,
          avg_cost_basis: 98.50,
          notes: "Core AI semiconductor overweight — concentration test",
        },
        {
          ticker: "AAPL",
          shares: 15,
          avg_cost_basis: 182.00,
          notes: "Large-cap ecosystem anchor",
        },
        {
          ticker: "MSFT",
          shares: 8,
          avg_cost_basis: 405.00,
          notes: "Enterprise cloud & AI infrastructure",
        },
        {
          ticker: "JPM",
          shares: 12,
          avg_cost_basis: 195.00,
          notes: "Financials sector hedge",
        },
      ];

      for (const h of demoHoldings) {
        await onSaveHolding(h);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load demo portfolio.");
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const handleStartEdit = (h: HoldingValuation) => {
    setEditingId(h.id);
    setTicker(h.ticker);
    setShares(h.shares.toString());
    setAvgCost(h.avg_cost_basis.toString());
    setNotes(h.notes || "");
    setErrorMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTicker("");
    setShares("");
    setAvgCost("");
    setNotes("");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTicker = ticker.trim().toUpperCase();
    const numShares = parseFloat(shares);
    const numCost = parseFloat(avgCost);

    if (!cleanTicker) {
      setErrorMsg("Please enter a ticker symbol.");
      return;
    }
    if (isNaN(numShares) || numShares <= 0) {
      setErrorMsg("Shares must be a positive number greater than 0.");
      return;
    }
    if (isNaN(numCost) || numCost <= 0) {
      setErrorMsg("Average cost basis must be greater than 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await onUpdateHolding(editingId, {
          ticker: cleanTicker,
          shares: numShares,
          avg_cost_basis: numCost,
          notes: notes.trim() || null,
        });
      } else {
        await onSaveHolding({
          ticker: cleanTicker,
          shares: numShares,
          avg_cost_basis: numCost,
          notes: notes.trim() || null,
        });
      }
      handleCancelEdit();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save position");
    } finally {
      setIsSubmitting(false);
    }
  };

  const holdings = portfolio?.holdings || [];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Portfolio Header Bar with Demo Seeder */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span>PORTFOLIO & ASSET LEDGER</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                PHASE 6
              </span>
            </h1>
            <p className="text-[11px] text-terminal-muted">
              Deterministic Real-Time Valuation & Weight Concentration Analysis
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoadDemoPortfolio}
          disabled={isSeedingDemo || loading}
          className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded font-mono font-semibold transition-all whitespace-nowrap shadow-sm"
        >
          <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSeedingDemo ? "animate-spin" : ""}`} />
          <span>{isSeedingDemo ? "Seeding 4 Positions..." : "⚡ Load Demo Portfolio"}</span>
        </button>
      </div>

      {/* 4-Card Portfolio Telemetry KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* Total Market Value */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-terminal-muted text-xs">
            <span className="flex items-center gap-1.5 truncate">
              <Briefcase className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate">TOTAL PORTFOLIO VALUE</span>
            </span>
            <span className="bg-slate-800 text-sky-400 px-2 py-0.5 rounded text-[10px] shrink-0">
              {portfolio?.holdings_count || 0} ASSETS
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              ${(portfolio?.total_market_value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-terminal-muted mt-1 truncate">
              Mark-to-market aggregate
            </div>
          </div>
        </div>

        {/* Total Cost Basis */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-terminal-muted text-xs">
            <span className="flex items-center gap-1.5 truncate">
              <DollarSign className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="truncate">TOTAL COST BASIS</span>
            </span>
            <span className="text-[10px] text-terminal-muted shrink-0">INVESTED</span>
          </div>
          <div className="mt-3 min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-200 tracking-tight truncate">
              ${(portfolio?.total_cost_basis || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-terminal-muted mt-1 truncate">
              Net capital allocated
            </div>
          </div>
        </div>

        {/* Unrealized P/L */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-terminal-muted text-xs">
            <span className="flex items-center gap-1.5 truncate">
              {isTotalPlPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="truncate">UNREALIZED P/L</span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                isTotalPlPositive
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}
            >
              {isTotalPlPositive ? "+" : ""}
              {(portfolio?.total_unrealized_pl_percent || 0).toFixed(2)}%
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight truncate ${
                isTotalPlPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isTotalPlPositive ? "+" : ""}$
              {(portfolio?.total_unrealized_pl || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-terminal-muted mt-1 truncate">
              Cumulative open return
            </div>
          </div>
        </div>

        {/* Day Change & Concentration Warning */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-terminal-muted text-xs">
            <span className="flex items-center gap-1.5 truncate">
              <PieChart className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">DAY P/L & CONCENTRATION</span>
            </span>
            {portfolio?.concentration_warning && (
              <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                <ShieldAlert className="w-3 h-3" />
                <span>&gt;25% CONC.</span>
              </span>
            )}
          </div>
          <div className="mt-3 min-w-0">
            <div
              className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                isDayPlPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isDayPlPositive ? "+" : ""}$
              {(portfolio?.total_day_change_dollar || 0).toFixed(2)} (
              {isDayPlPositive ? "+" : ""}
              {(portfolio?.total_day_change_percent || 0).toFixed(2)}%)
            </div>
            <div className="text-[11px] text-terminal-muted mt-1 truncate">
              Top:{" "}
              <span className="text-slate-200 font-semibold">
                {portfolio?.top_holding_ticker || "None"}
              </span>{" "}
              ({(portfolio?.top_holding_weight_percent || 0).toFixed(1)}% weight)
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Stacked Progress Bar */}
      {holdings.length > 0 && (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-3.5 h-3.5 text-sky-400" />
              <span>PORTFOLIO ASSET ALLOCATION WEIGHTS</span>
            </span>
            <span className="text-terminal-muted text-[11px]">
              Target balance &lt; 25% per asset
            </span>
          </div>

          {/* Color-coded segments bar */}
          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
            {holdings.map((h, idx) => {
              const colors = [
                "bg-sky-500",
                "bg-purple-500",
                "bg-emerald-500",
                "bg-amber-500",
                "bg-rose-500",
                "bg-indigo-500",
                "bg-cyan-500",
                "bg-teal-500",
              ];
              const col = colors[idx % colors.length];
              return (
                <div
                  key={h.id}
                  style={{ width: `${Math.max(h.weight_percent, 1)}%` }}
                  className={`${col} hover:opacity-80 transition-opacity relative group`}
                  title={`${h.ticker}: ${h.weight_percent.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* Allocation Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono">
            {holdings.map((h, idx) => {
              const dotColors = [
                "bg-sky-400",
                "bg-purple-400",
                "bg-emerald-400",
                "bg-amber-400",
                "bg-rose-400",
                "bg-indigo-400",
                "bg-cyan-400",
                "bg-teal-400",
              ];
              const dot = dotColors[idx % dotColors.length];
              return (
                <div key={h.id} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-slate-300 font-semibold">{h.ticker}</span>
                  <span className="text-terminal-muted">
                    {h.weight_percent.toFixed(1)}%
                  </span>
                  {h.is_concentrated && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded">
                      WARN
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Position Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-terminal-panel border border-terminal-border rounded-lg p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center gap-2">
            {editingId ? (
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Plus className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>{editingId ? `EDIT POSITION [${ticker}]` : "ADD PORTFOLIO HOLDING"}</span>
          </span>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="min-w-0">
            <label className="block text-[11px] text-terminal-muted mb-1 truncate">
              TICKER SYMBOL
            </label>
            <input
              type="text"
              placeholder="e.g. AAPL"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              disabled={isSubmitting}
              maxLength={10}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 uppercase min-w-0"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] text-terminal-muted mb-1 truncate">
              SHARES QUANTITY
            </label>
            <input
              type="number"
              step="any"
              min="0.0001"
              placeholder="e.g. 15.0"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 min-w-0"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] text-terminal-muted mb-1 truncate">
              AVG COST BASIS ($)
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 182.50"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 min-w-0"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] text-terminal-muted mb-1 truncate">
              RESEARCH / STRATEGY NOTES
            </label>
            <input
              type="text"
              placeholder="e.g. Long-term core tech holding"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              maxLength={500}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 min-w-0"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono">
          <button
            type="button"
            onClick={handleLoadDemoPortfolio}
            disabled={isSeedingDemo || loading}
            className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1.5 font-mono px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSeedingDemo ? "animate-spin" : ""}`} />
            <span>⚡ Load Demo Portfolio</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isSubmitting
                ? "Processing..."
                : editingId
                ? "Update Position"
                : "+ Record Position"}
            </span>
          </button>
        </div>
      </form>

      {/* Institutional Holdings Table */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden flex flex-col font-mono">
        <div className="p-3 border-b border-terminal-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-300">
            PORTFOLIO ASSET LEDGER ({holdings.length})
          </span>
          <span className="text-[11px] text-terminal-muted">
            Deterministic valuation & P/L calculation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-terminal-muted border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">TICKER</th>
                <th className="py-2.5 px-3 text-right">SHARES</th>
                <th className="py-2.5 px-3 text-right">AVG COST</th>
                <th className="py-2.5 px-3 text-right">LAST PRICE</th>
                <th className="py-2.5 px-3 text-right">TOTAL COST</th>
                <th className="py-2.5 px-3 text-right">MARKET VAL</th>
                <th className="py-2.5 px-3 text-right">UNREALIZED P/L</th>
                <th className="py-2.5 px-3 text-right">DAY CHANGE</th>
                <th className="py-2.5 px-3 text-right">WEIGHT %</th>
                <th className="py-2.5 px-3">NOTES</th>
                <th className="py-2.5 px-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    <p className="mb-3 text-slate-400">No portfolio positions recorded yet. Add your first holding above.</p>
                    <button
                      type="button"
                      onClick={handleLoadDemoPortfolio}
                      disabled={isSeedingDemo || loading}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3.5 py-1.5 rounded font-mono font-semibold transition-all shadow-sm"
                    >
                      <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSeedingDemo ? "animate-spin" : ""}`} />
                      <span>{isSeedingDemo ? "Loading Institutional Demo..." : "⚡ Load Demo Portfolio"}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                holdings.map((h) => {
                  const isPlUp = h.unrealized_pl >= 0;
                  const isDayUp = h.day_change_dollar >= 0;

                  return (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Ticker */}
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => onSelectTicker(h.ticker)}
                          className="font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1.5"
                          title="Open in Terminal Candlestick Chart"
                        >
                          <span>{h.ticker}</span>
                          <BarChart2 className="w-3 h-3 text-slate-500" />
                        </button>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {h.company_name || "—"}
                        </div>
                      </td>

                      {/* Shares */}
                      <td className="py-2.5 px-3 text-right font-medium">
                        {h.shares.toLocaleString()}
                      </td>

                      {/* Avg Cost */}
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        ${h.avg_cost_basis.toFixed(2)}
                      </td>

                      {/* Last Price */}
                      <td className="py-2.5 px-3 text-right font-semibold text-white">
                        ${h.current_price.toFixed(2)}
                      </td>

                      {/* Total Cost */}
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        ${h.total_cost.toFixed(2)}
                      </td>

                      {/* Market Value */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                        ${h.market_value.toFixed(2)}
                      </td>

                      {/* Unrealized P/L */}
                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          isPlUp ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPlUp ? "+" : ""}${h.unrealized_pl.toFixed(2)} (
                        {isPlUp ? "+" : ""}
                        {h.unrealized_pl_percent.toFixed(2)}%)
                      </td>

                      {/* Day Change */}
                      <td
                        className={`py-2.5 px-3 text-right ${
                          isDayUp ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isDayUp ? "+" : ""}${h.day_change_dollar.toFixed(2)}
                      </td>

                      {/* Weight % */}
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-semibold ${
                            h.is_concentrated
                              ? "text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30"
                              : "text-slate-300"
                          }`}
                        >
                          {h.weight_percent.toFixed(1)}%
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">
                        {h.notes || "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectTicker(h.ticker)}
                            title="View Chart in Terminal"
                            className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(h)}
                            title="Edit Holding"
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete holding position for ${h.ticker}?`
                                )
                              ) {
                                onDeleteHolding(h.id);
                              }
                            }}
                            title="Delete Holding"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

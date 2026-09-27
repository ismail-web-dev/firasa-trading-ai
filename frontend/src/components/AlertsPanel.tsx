"use client";

import React, { useState } from "react";
import {
  AlertsSummaryResponse,
  AlertRead,
  AlertCreate,
} from "@/types/market";
import {
  Bell,
  BellRing,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  ArrowUpRight,
  Zap,
  Sparkles,
} from "lucide-react";

interface AlertsPanelProps {
  alertsData: AlertsSummaryResponse | null;
  onCreateAlert: (payload: AlertCreate) => Promise<void>;
  onToggleAlert: (id: number, isActive: boolean) => Promise<void>;
  onResetAlert: (id: number) => Promise<void>;
  onDeleteAlert: (id: number) => Promise<void>;
  onEvaluateAlerts: () => Promise<void>;
  onSelectTicker: (ticker: string) => void;
  loading: boolean;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alertsData,
  onCreateAlert,
  onToggleAlert,
  onResetAlert,
  onDeleteAlert,
  onEvaluateAlerts,
  onSelectTicker,
  loading,
}) => {
  const [ticker, setTicker] = useState("");
  const [conditionType, setConditionType] = useState<string>("PRICE_ABOVE");
  const [thresholdValue, setThresholdValue] = useState<string>("185.0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeedingSample, setIsSeedingSample] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSMACross =
    conditionType === "SMA20_ABOVE_SMA50" ||
    conditionType === "SMA20_BELOW_SMA50";

  const handleConditionChange = (type: string) => {
    setConditionType(type);
    setErrorMsg(null);
    if (type === "RSI_ABOVE") {
      setThresholdValue("70.0");
    } else if (type === "RSI_BELOW") {
      setThresholdValue("30.0");
    } else if (type.startsWith("PRICE")) {
      setThresholdValue("185.0");
    } else {
      setThresholdValue("0.0");
    }
  };

  const handleLoadSampleAlerts = async () => {
    try {
      setIsSeedingSample(true);
      setErrorMsg(null);
      const sampleAlerts: AlertCreate[] = [
        {
          ticker: "AAPL",
          condition_type: "PRICE_ABOVE",
          threshold_value: 100.0,
        },
        {
          ticker: "NVDA",
          condition_type: "RSI_ABOVE",
          threshold_value: 70.0,
        },
        {
          ticker: "MSFT",
          condition_type: "SMA20_ABOVE_SMA50",
          threshold_value: 0.0,
        },
      ];

      for (const a of sampleAlerts) {
        await onCreateAlert(a);
      }
      // Re-evaluate immediately to trigger signals banner for demo
      await onEvaluateAlerts();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load sample alert rules.");
    } finally {
      setIsSeedingSample(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTicker = ticker.trim().toUpperCase();
    const numThreshold = isSMACross ? 0.0 : parseFloat(thresholdValue);

    if (!cleanTicker) {
      setErrorMsg("Please specify a ticker symbol.");
      return;
    }
    if (!isSMACross && (isNaN(numThreshold) || numThreshold <= 0)) {
      setErrorMsg("Please enter a valid threshold value greater than 0.");
      return;
    }
    if (conditionType.startsWith("RSI") && (numThreshold <= 0 || numThreshold >= 100)) {
      setErrorMsg("RSI threshold must be between 0 and 100.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateAlert({
        ticker: cleanTicker,
        condition_type: conditionType,
        threshold_value: numThreshold,
      });
      setTicker("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create alert rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const alerts = alertsData?.alerts || [];
  const triggeredAlerts = alerts.filter((a) => a.is_triggered);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Alerts Header Bar with Sample Rules Seeder */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span>TECHNICAL ALERT ENGINE</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                PHASE 7
              </span>
            </h1>
            <p className="text-[11px] text-terminal-muted">
              Deterministic Price & Indicator Rule Evaluator (SQLite Persistence)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSampleAlerts}
            disabled={isSeedingSample || loading}
            className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded font-mono font-semibold transition-all whitespace-nowrap shadow-sm"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSeedingSample ? "animate-spin" : ""}`} />
            <span>{isSeedingSample ? "Seeding 3 Rules..." : "⚡ Load Sample Alerts"}</span>
          </button>
          <button
            type="button"
            onClick={onEvaluateAlerts}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded transition-colors whitespace-nowrap"
          >
            <Activity className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Re-Evaluate All</span>
          </button>
        </div>
      </div>
      {/* 3-Card Alert Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-xs">
            <span className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-sky-400" />
              <span>TOTAL CONFIGURED RULES</span>
            </span>
            <span className="text-[10px] text-slate-500">SQLITE STORE</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {alertsData?.total_alerts || 0}
            </div>
            <div className="text-[11px] text-terminal-muted mt-1">
              Active rule monitors
            </div>
          </div>
        </div>

        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-xs">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ACTIVE WATCHERS</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              RUNNING
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {alertsData?.active_count || 0}
            </div>
            <div className="text-[11px] text-terminal-muted mt-1">
              Live deterministic evaluators
            </div>
          </div>
        </div>

        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-xs">
            <span className="flex items-center gap-1.5">
              <BellRing className="w-4 h-4 text-amber-400" />
              <span>TRIGGERED SIGNALS</span>
            </span>
            {(alertsData?.triggered_count || 0) > 0 && (
              <span className="animate-pulse bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold">
                ATTENTION
              </span>
            )}
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold tracking-tight ${
                (alertsData?.triggered_count || 0) > 0
                  ? "text-rose-400"
                  : "text-slate-400"
              }`}
            >
              {alertsData?.triggered_count || 0}
            </div>
            <div className="text-[11px] text-terminal-muted mt-1">
              Conditions currently met
            </div>
          </div>
        </div>
      </div>

      {/* Triggered Signals Banner */}
      {triggeredAlerts.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
              <BellRing className="w-4 h-4 animate-bounce" />
              <span>TRIGGERED TECHNICAL SIGNALS ({triggeredAlerts.length})</span>
            </div>
            <span className="text-[10px] text-rose-300">
              Immediate attention suggested
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {triggeredAlerts.map((a) => (
              <div
                key={a.id}
                className="bg-slate-900 border border-rose-500/40 rounded p-3 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">
                      {a.ticker}
                    </span>
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded">
                      {a.condition_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {a.status_message}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Triggered: {a.triggered_at ? new Date(a.triggered_at).toLocaleTimeString() : "Now"}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => onSelectTicker(a.ticker)}
                    className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 px-2 py-0.5 rounded bg-slate-800"
                  >
                    <BarChart2 className="w-3 h-3" />
                    <span>View Chart</span>
                  </button>
                  <button
                    onClick={() => onResetAlert(a.id)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                    title="Reset Trigger"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Alert Rule Bar */}
      <form
        onSubmit={handleCreateSubmit}
        className="bg-terminal-panel border border-terminal-border rounded-lg p-4 space-y-3 font-mono"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>CREATE TECHNICAL ALERT RULE</span>
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSampleAlerts}
              disabled={isSeedingSample || loading}
              className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded transition-colors whitespace-nowrap font-semibold"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSeedingSample ? "animate-spin" : ""}`} />
              <span>⚡ Load Sample Alerts</span>
            </button>
            <button
              type="button"
              onClick={onEvaluateAlerts}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded transition-colors whitespace-nowrap"
            >
              <Activity className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Re-Evaluate All</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Ticker Input */}
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

          {/* Condition Select */}
          <div className="min-w-0">
            <label className="block text-[11px] text-terminal-muted mb-1 truncate">
              CONDITION CRITERIA
            </label>
            <select
              value={conditionType}
              onChange={(e) => handleConditionChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500 min-w-0"
            >
              <option value="PRICE_ABOVE">Price Above ($)</option>
              <option value="PRICE_BELOW">Price Below ($)</option>
              <option value="RSI_ABOVE">RSI Above (Overbought)</option>
              <option value="RSI_BELOW">RSI Below (Oversold)</option>
              <option value="SMA20_ABOVE_SMA50">SMA 20 &gt; SMA 50 (Bullish Cross)</option>
              <option value="SMA20_BELOW_SMA50">SMA 20 &lt; SMA 50 (Bearish Cross)</option>
            </select>
          </div>

          {/* Threshold Input */}
          <div className="min-w-0">
            <label className="block text-[11px] text-terminal-muted mb-1 truncate">
              THRESHOLD VALUE
            </label>
            <input
              type="number"
              step="any"
              disabled={isSMACross || isSubmitting}
              placeholder={isSMACross ? "Auto (Crossover)" : "e.g. 185.0"}
              value={isSMACross ? "" : thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 disabled:bg-slate-950 disabled:opacity-50 min-w-0"
            />
          </div>

          {/* Preset Buttons & Submit */}
          <div className="flex flex-col justify-end min-w-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap min-w-0"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>{isSubmitting ? "Creating..." : "+ Arm Alert Rule"}</span>
            </button>
          </div>
        </div>

        {/* Quick Presets Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-terminal-muted">
          <span className="whitespace-nowrap">Presets:</span>
          <button
            type="button"
            onClick={() => {
              setConditionType("RSI_ABOVE");
              setThresholdValue("70.0");
            }}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:text-white whitespace-nowrap"
          >
            RSI 70 Overbought
          </button>
          <button
            type="button"
            onClick={() => {
              setConditionType("RSI_BELOW");
              setThresholdValue("30.0");
            }}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:text-white whitespace-nowrap"
          >
            RSI 30 Oversold
          </button>
          <button
            type="button"
            onClick={() => {
              setConditionType("SMA20_ABOVE_SMA50");
              setThresholdValue("0.0");
            }}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:text-white whitespace-nowrap"
          >
            Golden Cross (SMA20 &gt; 50)
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* All Alert Rules Table */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden flex flex-col font-mono">
        <div className="p-3 border-b border-terminal-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-300">
            ACTIVE MONITORS & HISTORICAL RULES ({alerts.length})
          </span>
          <span className="text-[11px] text-terminal-muted">
            Continuous deterministic rule evaluation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-terminal-muted border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">TICKER</th>
                <th className="py-2.5 px-3">CONDITION</th>
                <th className="py-2.5 px-3 text-right">THRESHOLD</th>
                <th className="py-2.5 px-3 text-right">CURRENT VALUE</th>
                <th className="py-2.5 px-3">STATUS TELEMETRY</th>
                <th className="py-2.5 px-3">TRIGGERED AT</th>
                <th className="py-2.5 px-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <p className="mb-3 text-slate-400">No alert rules armed. Set up your first price or indicator rule above.</p>
                    <button
                      type="button"
                      onClick={handleLoadSampleAlerts}
                      disabled={isSeedingSample || loading}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3.5 py-1.5 rounded font-mono font-semibold transition-all shadow-sm"
                    >
                      <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSeedingSample ? "animate-spin" : ""}`} />
                      <span>{isSeedingSample ? "Seeding 3 Rules..." : "⚡ Load Sample Alerts"}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      {!a.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          PAUSED
                        </span>
                      ) : a.is_triggered ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          TRIGGERED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          WATCHING
                        </span>
                      )}
                    </td>

                    {/* Ticker */}
                    <td className="py-2.5 px-3 font-bold text-white">
                      <button
                        onClick={() => onSelectTicker(a.ticker)}
                        className="hover:text-sky-400 flex items-center gap-1"
                        title="View in Chart"
                      >
                        <span>{a.ticker}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-500" />
                      </button>
                    </td>

                    {/* Condition */}
                    <td className="py-2.5 px-3 text-sky-400 font-medium">
                      {a.condition_type}
                    </td>

                    {/* Threshold */}
                    <td className="py-2.5 px-3 text-right text-slate-300 font-medium">
                      {a.condition_type.includes("PRICE")
                        ? `$${a.threshold_value.toFixed(2)}`
                        : a.condition_type.includes("RSI")
                        ? a.threshold_value.toFixed(1)
                        : "CROSSOVER"}
                    </td>

                    {/* Current Value */}
                    <td className="py-2.5 px-3 text-right text-slate-200 font-semibold">
                      {a.current_metric_value !== null
                        ? a.condition_type.includes("PRICE")
                          ? `$${a.current_metric_value.toFixed(2)}`
                          : a.condition_type.includes("RSI")
                          ? a.current_metric_value.toFixed(2)
                          : `Spread: ${a.current_metric_value.toFixed(2)}`
                        : "—"}
                    </td>

                    {/* Status Telemetry */}
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                      {a.status_message}
                    </td>

                    {/* Triggered At */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {a.triggered_at
                        ? new Date(a.triggered_at).toLocaleString()
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectTicker(a.ticker)}
                          title="Open Chart in Terminal"
                          className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleAlert(a.id, !a.is_active)}
                          title={a.is_active ? "Pause Alert" : "Resume Alert"}
                          className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                        >
                          {a.is_active ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {a.is_triggered && (
                          <button
                            onClick={() => onResetAlert(a.id)}
                            title="Reset Triggered State"
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Delete alert rule #${a.id}?`)) {
                              onDeleteAlert(a.id);
                            }
                          }}
                          title="Delete Alert"
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from "react";
import {
  MarketAnalysisResponse,
  PortfolioRiskAuditResponse,
  OpportunityScanResponse,
  OpportunityCandidate,
} from "@/types/market";
import {
  fetchMarketAnalysis,
  fetchPortfolioRiskAudit,
  fetchOpportunityScan,
} from "@/lib/api";
import {
  Brain,
  ShieldAlert,
  Radar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Compass,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Info,
  Layers,
  Activity,
  Sliders,
  BarChart2,
} from "lucide-react";

interface AIIntelligencePanelProps {
  initialTicker: string;
  watchlistTickers: string[];
  onSelectTicker: (ticker: string) => void;
}

export const AIIntelligencePanel: React.FC<AIIntelligencePanelProps> = ({
  initialTicker,
  watchlistTickers,
  onSelectTicker,
}) => {
  const [subTab, setSubTab] = useState<"analysis" | "audit" | "scanner">("analysis");

  // Phase 8 State: Market Analysis
  const [selectedTicker, setSelectedTicker] = useState<string>(initialTicker || "AAPL");
  const [analysisData, setAnalysisData] = useState<MarketAnalysisResponse | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Phase 9 State: Portfolio Risk Audit
  const [auditData, setAuditData] = useState<PortfolioRiskAuditResponse | null>(null);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Phase 10 State: Opportunity Scanner
  const [scanData, setScanData] = useState<OpportunityScanResponse | null>(null);
  const [loadingScan, setLoadingScan] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Synchronize initialTicker when prop changes
  useEffect(() => {
    if (initialTicker && initialTicker !== selectedTicker) {
      setSelectedTicker(initialTicker);
    }
  }, [initialTicker]);

  // Handler: Run Market Analysis (Phase 8)
  const handleRunAnalysis = useCallback(async (tickerToAnalyze: string) => {
    try {
      setLoadingAnalysis(true);
      setAnalysisError(null);
      const res = await fetchMarketAnalysis(tickerToAnalyze);
      setAnalysisData(res);
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to execute AI market analysis.");
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  // Handler: Run Portfolio Risk Audit (Phase 9)
  const handleRunAudit = useCallback(async () => {
    try {
      setLoadingAudit(true);
      setAuditError(null);
      const res = await fetchPortfolioRiskAudit();
      setAuditData(res);
    } catch (err: any) {
      setAuditError(err.message || "Failed to audit portfolio risk.");
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  // Handler: Run Opportunity Scanner (Phase 10)
  const handleRunScan = useCallback(async () => {
    try {
      setLoadingScan(true);
      setScanError(null);
      const res = await fetchOpportunityScan();
      setScanData(res);
    } catch (err: any) {
      setScanError(err.message || "Failed to scan opportunities.");
    } finally {
      setLoadingScan(false);
    }
  }, []);

  // Auto-load analysis on initial mount
  useEffect(() => {
    if (!analysisData && selectedTicker) {
      handleRunAnalysis(selectedTicker);
    }
  }, [selectedTicker, handleRunAnalysis, analysisData]);

  // Auto-load audit or scan when switching tabs if not already loaded
  useEffect(() => {
    if (subTab === "audit" && !auditData && !loadingAudit) {
      handleRunAudit();
    } else if (subTab === "scanner" && !scanData && !loadingScan) {
      handleRunScan();
    }
  }, [subTab, auditData, loadingAudit, scanData, loadingScan, handleRunAudit, handleRunScan]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 text-terminal-text font-sans">
      {/* Top Banner: Sub-tabs & Module Status */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-white tracking-wide flex items-center gap-2">
                <span>FIRASA AI INTELLIGENCE HUB</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono">
                  PHASES 8-10
                </span>
              </h1>
              <p className="text-xs text-terminal-muted font-mono mt-0.5">
                Deterministic Quantitative Grounding + Institutional AI Narrative Synthesis
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setSubTab("analysis")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all ${
              subTab === "analysis"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Market Analysis (P8)</span>
          </button>

          <button
            onClick={() => setSubTab("audit")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all ${
              subTab === "audit"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Risk Auditor (P9)</span>
          </button>

          <button
            onClick={() => setSubTab("scanner")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all ${
              subTab === "scanner"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-purple-400" />
            <span>Opportunity Scanner (P10)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: MARKET ANALYSIS ENGINE (PHASE 8)                               */}
      {/* ========================================================================= */}
      {subTab === "analysis" && (
        <div className="space-y-6">
          {/* Ticker Control & Trigger Bar */}
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Select Asset:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
                {watchlistTickers.slice(0, 8).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTicker(t);
                      handleRunAnalysis(t);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      selectedTicker === t
                        ? "bg-sky-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
                  placeholder="CUSTOM TICKER"
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white uppercase placeholder-slate-500 w-32 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={() => handleRunAnalysis(selectedTicker)}
                disabled={loadingAnalysis || !selectedTicker.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-semibold transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalysis ? "animate-spin" : ""}`} />
                <span>{loadingAnalysis ? "Synthesizing..." : "Run AI Analysis"}</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {analysisError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg p-3 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* Analysis Results View */}
          {analysisData && (
            <div className="space-y-4">
              {/* Header Badges & Confidence Meter Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Regime / Bias Badge */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-terminal-muted uppercase tracking-wider">
                      TECHNICAL BIAS
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {analysisData.bias === "BULLISH" ? (
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      ) : analysisData.bias === "BEARISH" ? (
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                      ) : (
                        <Compass className="w-5 h-5 text-slate-400" />
                      )}
                      <span
                        className={`text-lg font-bold font-mono ${
                          analysisData.bias === "BULLISH"
                            ? "text-emerald-400"
                            : analysisData.bias === "BEARISH"
                            ? "text-rose-400"
                            : "text-slate-300"
                        }`}
                      >
                        {analysisData.bias}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      analysisData.bias === "BULLISH"
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                        : analysisData.bias === "BEARISH"
                        ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}
                  >
                    REGIME-ALIGNED
                  </span>
                </div>

                {/* 2. Confidence Score Meter */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] font-mono text-terminal-muted uppercase tracking-wider">
                    <span>CONFIDENCE INDEX</span>
                    <span className="text-white font-bold text-xs">{analysisData.confidence_score}%</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        analysisData.confidence_score >= 75
                          ? "bg-emerald-400"
                          : analysisData.confidence_score >= 50
                          ? "bg-sky-400"
                          : "bg-amber-400"
                      }`}
                      style={{ width: `${analysisData.confidence_score}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                    <span>Deterministic Factor Weight</span>
                    <span>120-Day Horizon</span>
                  </div>
                </div>

                {/* 3. Model Engine & Timestamp */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between">
                  <div className="text-[10px] font-mono text-terminal-muted uppercase tracking-wider">
                    SYNTHESIS ENGINE
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-semibold text-slate-200 truncate">
                      {analysisData.model_used}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {new Date(analysisData.generated_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}{" "}
                    UTC
                  </div>
                </div>
              </div>

              {/* Executive Summary Card */}
              <div className="bg-terminal-panel border border-terminal-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2 text-xs font-mono text-sky-400 font-semibold uppercase tracking-wider">
                  <Info className="w-4 h-4" />
                  <span>Executive AI Research Summary</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200 font-sans">
                  {analysisData.executive_summary}
                </p>
              </div>

              {/* 5-Card Deterministic Price Levels Grid */}
              <div>
                <h3 className="text-xs font-mono text-terminal-muted uppercase tracking-wider mb-2.5">
                  Pre-Computed Deterministic Price Levels (Zero LLM Math)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
                  <div className="bg-terminal-panel border border-terminal-border rounded p-3">
                    <div className="text-[10px] text-slate-400">CURRENT PRICE</div>
                    <div className="text-sm font-bold text-white mt-1">
                      ${analysisData.key_levels.current_price?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-terminal-panel border border-terminal-border rounded p-3">
                    <div className="text-[10px] text-emerald-400">20D SUPPORT</div>
                    <div className="text-sm font-bold text-emerald-300 mt-1">
                      ${analysisData.key_levels.support_estimate?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-terminal-panel border border-terminal-border rounded p-3">
                    <div className="text-[10px] text-rose-400">20D RESISTANCE</div>
                    <div className="text-sm font-bold text-rose-300 mt-1">
                      ${analysisData.key_levels.resistance_estimate?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-terminal-panel border border-terminal-border rounded p-3">
                    <div className="text-[10px] text-sky-400">SMA 20</div>
                    <div className="text-sm font-bold text-sky-300 mt-1">
                      ${analysisData.key_levels.sma_20?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-terminal-panel border border-terminal-border rounded p-3">
                    <div className="text-[10px] text-amber-400">SMA 50</div>
                    <div className="text-sm font-bold text-amber-300 mt-1">
                      ${analysisData.key_levels.sma_50?.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column: Technical Breakdown & Risk Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Technical Breakdown Bullets */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                    <BarChart2 className="w-4 h-4" />
                    <span>Technical Indicator Breakdown</span>
                  </div>
                  <ul className="space-y-2 text-xs font-mono text-slate-300">
                    {analysisData.technical_breakdown.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk Factors List */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 text-xs font-mono text-rose-400 font-semibold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Calculated Risk Factors</span>
                  </div>
                  <ul className="space-y-2 text-xs font-mono text-slate-300">
                    {analysisData.risk_factors.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-400 mt-0.5">▲</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action to Jump to Terminal Chart */}
              <div className="flex justify-end">
                <button
                  onClick={() => onSelectTicker(analysisData.ticker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-mono transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect {analysisData.ticker} in Terminal Chart</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PORTFOLIO RISK AUDITOR (PHASE 9)                               */}
      {/* ========================================================================= */}
      {subTab === "audit" && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Automated Portfolio Risk & Diversification Auditor
              </h2>
              <p className="text-xs font-mono text-terminal-muted mt-0.5">
                Evaluates concentration shock risk, down-regime equity weighting, and RSI exhaustion.
              </p>
            </div>
            <button
              onClick={handleRunAudit}
              disabled={loadingAudit}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? "animate-spin" : ""}`} />
              <span>{loadingAudit ? "Auditing Portfolio..." : "Run Portfolio Risk Audit"}</span>
            </button>
          </div>

          {/* Error Message */}
          {auditError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg p-3 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{auditError}</span>
            </div>
          )}

          {auditData && (
            <div className="space-y-4">
              {/* Overall Risk Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Risk Level Badge */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-terminal-muted uppercase tracking-wider">
                      OVERALL RISK LEVEL
                    </span>
                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        auditData.overall_risk_level === "CRITICAL"
                          ? "text-rose-500"
                          : auditData.overall_risk_level === "HIGH"
                          ? "text-rose-400"
                          : auditData.overall_risk_level === "MODERATE"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {auditData.overall_risk_level}
                    </div>
                  </div>
                  <ShieldAlert
                    className={`w-7 h-7 ${
                      auditData.overall_risk_level === "CRITICAL" ||
                      auditData.overall_risk_level === "HIGH"
                        ? "text-rose-400 animate-pulse"
                        : auditData.overall_risk_level === "MODERATE"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  />
                </div>

                {/* Deterministic Risk Score Progress Meter */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] font-mono text-terminal-muted uppercase tracking-wider">
                    <span>DETERMINISTIC RISK SCORE</span>
                    <span className="text-white font-bold text-xs">{auditData.risk_score} / 100</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        auditData.risk_score >= 70
                          ? "bg-rose-500"
                          : auditData.risk_score >= 45
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${auditData.risk_score}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                    <span>0: Minimum Risk</span>
                    <span>100: Critical Exposure</span>
                  </div>
                </div>

                {/* Portfolio Snapshot Quick Stats */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 font-mono text-xs flex flex-col justify-between">
                  <div className="text-[10px] text-terminal-muted uppercase tracking-wider">
                    HOLDINGS SNAPSHOT
                  </div>
                  <div className="flex justify-between items-center text-slate-200 mt-1">
                    <span>Positions: {auditData.portfolio_snapshot.holdings_count}</span>
                    <span>
                      Top: {auditData.portfolio_snapshot.top_holding || "None"} (
                      {auditData.portfolio_snapshot.top_holding_weight?.toFixed(1) || 0}%)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Value: $
                    {Number(auditData.portfolio_snapshot.total_market_value || 0).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 }
                    )}
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-terminal-panel border border-terminal-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2 text-xs font-mono text-amber-400 font-semibold uppercase tracking-wider">
                  <Info className="w-4 h-4" />
                  <span>Portfolio Auditor Assessment</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200 font-sans">
                  {auditData.executive_summary}
                </p>
              </div>

              {/* 3 Institutional Analysis Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Concentration Analysis */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-amber-400 font-semibold uppercase tracking-wider">
                    <Sliders className="w-4 h-4" />
                    <span>Concentration Analysis</span>
                  </div>
                  <ul className="space-y-2 text-xs font-mono text-slate-300">
                    {auditData.concentration_analysis.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Technical Exposure Warnings */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-rose-400 font-semibold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Technical Regime Warnings</span>
                  </div>
                  <ul className="space-y-2 text-xs font-mono text-slate-300">
                    {auditData.technical_exposure_warnings.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-400 mt-0.5">!</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Diversification Research Suggestions */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-sky-400 font-semibold uppercase tracking-wider">
                    <Layers className="w-4 h-4" />
                    <span>Diversification Notes</span>
                  </div>
                  <ul className="space-y-2 text-xs font-mono text-slate-300">
                    {auditData.diversification_suggestions.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-sky-400 mt-0.5">→</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: AI OPPORTUNITY SCANNER (PHASE 10)                              */}
      {/* ========================================================================= */}
      {subTab === "scanner" && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Automated Universe Opportunity Scanner
              </h2>
              <p className="text-xs font-mono text-terminal-muted mt-0.5">
                Screening technical regimes, oversold bounces, and bullish trend momentum setups.
              </p>
            </div>
            <button
              onClick={handleRunScan}
              disabled={loadingScan}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingScan ? "animate-spin" : ""}`} />
              <span>{loadingScan ? "Scanning Universe..." : "Scan Watchlist Universe"}</span>
            </button>
          </div>

          {/* Error Message */}
          {scanError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg p-3 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {scanData && (
            <div className="space-y-4">
              {/* Market Regime Summary Banner */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 flex items-center gap-3">
                <Radar className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div className="font-mono text-xs">
                  <div className="text-purple-300 font-bold uppercase tracking-wider">
                    MARKET REGIME OVERVIEW
                  </div>
                  <div className="text-slate-200 mt-0.5">
                    {scanData.market_regime_summary}
                  </div>
                </div>
              </div>

              {/* Candidate Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scanData.candidates.map((cand) => {
                  const isPositive = cand.change_percent >= 0;
                  return (
                    <div
                      key={cand.ticker}
                      className="bg-terminal-panel border border-terminal-border rounded-lg p-4 flex flex-col justify-between hover:border-slate-600 transition-colors"
                    >
                      <div>
                        {/* Top row: Ticker, Price, Setup Badge */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold font-mono text-white">
                              {cand.ticker}
                            </span>
                            <span className="text-xs font-mono text-slate-400 truncate max-w-[120px]">
                              {cand.company_name || ""}
                            </span>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-sm font-bold text-white">
                              ${cand.price.toFixed(2)}
                            </span>
                            <span
                              className={`text-xs ml-2 font-semibold ${
                                isPositive ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {cand.change_percent.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {/* Setup Type Badge */}
                        <div className="mt-2.5 flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide ${
                              cand.setup_type === "BULLISH_TREND_MOMENTUM"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : cand.setup_type === "OVERSOLD_REVERSAL_WATCH"
                                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                : cand.setup_type === "OVERBOUGHT_PULLBACK_WATCH"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {cand.setup_type.replace(/_/g, " ")}
                          </span>

                          <span className="text-[11px] font-mono text-slate-300">
                            RSI-14:{" "}
                            <span className="font-semibold text-white">
                              {cand.rsi_14 !== null && cand.rsi_14 !== undefined
                                ? cand.rsi_14.toFixed(1)
                                : "—"}
                            </span>
                          </span>
                        </div>

                        {/* Signal Strength Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>SIGNAL STRENGTH</span>
                            <span className="font-bold text-slate-200">
                              {cand.signal_strength}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-full ${
                                cand.signal_strength >= 80
                                  ? "bg-purple-400"
                                  : cand.signal_strength >= 60
                                  ? "bg-sky-400"
                                  : "bg-slate-400"
                              }`}
                              style={{ width: `${cand.signal_strength}%` }}
                            />
                          </div>
                        </div>

                        {/* AI Rationale */}
                        <p className="mt-3 text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/50 p-2.5 rounded border border-slate-800/80">
                          {cand.ai_rationale}
                        </p>
                      </div>

                      {/* Card Footer: Action button */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          Regime: {cand.trend_regime}
                        </span>
                        <button
                          onClick={() => onSelectTicker(cand.ticker)}
                          className="flex items-center gap-1 text-xs font-mono text-sky-400 hover:text-sky-300 font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Chart</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import { CacheStatus } from "@/types/market";
import { Activity, Database, ShieldCheck, Terminal, Cpu, Search } from "lucide-react";

interface TerminalHeaderProps {
  isBackendConnected: boolean;
  cacheStatus: CacheStatus | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  triggeredAlertsCount?: number;
  onQuickJumpTicker?: (ticker: string) => void;
  isLivePulse?: boolean;
  onToggleLivePulse?: () => void;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  isBackendConnected,
  cacheStatus,
  activeTab,
  setActiveTab,
  triggeredAlertsCount = 0,
  onQuickJumpTicker,
  isLivePulse = true,
  onToggleLivePulse,
}) => {
  const [jumpInput, setJumpInput] = useState("");

  const handleQuickJump = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = jumpInput.trim().toUpperCase();
    if (clean && /^[A-Z0-9.\-]{1,10}$/.test(clean) && onQuickJumpTicker) {
      onQuickJumpTicker(clean);
      setJumpInput("");
    }
  };

  return (
    <header className="border-b border-terminal-border bg-terminal-panel/90 backdrop-blur px-3 xl:px-4 py-2 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5 xl:gap-3.5">
      {/* Brand & Terminal Identifier (Left) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-sm tracking-wider shrink-0">
          <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="whitespace-nowrap">FIRASA // فراسة</span>
        </div>
        <span className="hidden 2xl:inline-block text-[11px] uppercase tracking-widest text-terminal-muted border-l border-terminal-border pl-2.5 whitespace-nowrap">
          AI-POWERED MARKET INTELLIGENCE
        </span>
      </div>

      {/* Navigation Tabs (Center) - No scrollbar, never wrapped or clipped */}
      <nav className="flex items-center gap-1.5 shrink-0 overflow-visible text-xs font-mono">
        <button
          onClick={() => setActiveTab("terminal")}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
            activeTab === "terminal"
              ? "bg-slate-800 text-sky-400 border-sky-500/40"
              : "text-terminal-muted border-transparent hover:border-terminal-border hover:text-terminal-text"
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="whitespace-nowrap">Terminal</span>
        </button>

        <button
          onClick={() => setActiveTab("portfolio")}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
            activeTab === "portfolio"
              ? "bg-slate-800 text-sky-400 border-sky-500/40"
              : "text-terminal-muted border-transparent hover:border-terminal-border hover:text-terminal-text"
          }`}
        >
          <span className="whitespace-nowrap">Portfolio</span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
            activeTab === "alerts"
              ? "bg-slate-800 text-sky-400 border-sky-500/40"
              : "text-terminal-muted border-transparent hover:border-terminal-border hover:text-terminal-text"
          }`}
        >
          <span className="whitespace-nowrap">Alerts</span>
          {triggeredAlertsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
              {triggeredAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
            activeTab === "ai"
              ? "bg-slate-800 text-sky-400 border-sky-500/40"
              : "text-terminal-muted border-transparent hover:border-terminal-border hover:text-terminal-text"
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="whitespace-nowrap">AI Intelligence</span>
        </button>
      </nav>

      {/* Right Controls: Quick-Jump Search & Telemetry Badges */}
      <div className="flex items-center flex-wrap gap-2 shrink-0">
        {/* Quick-Jump Ticker Command Box */}
        {onQuickJumpTicker && (
          <form onSubmit={handleQuickJump} className="flex items-center gap-1 font-mono text-xs shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value.toUpperCase())}
                placeholder="TICKER..."
                className="pl-7 pr-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 w-28 xl:w-36 focus:outline-none focus:border-sky-500 text-xs uppercase"
              />
            </div>
            <button
              type="submit"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 text-[11px] font-semibold transition-colors"
            >
              GO
            </button>
          </form>
        )}

        {/* Live System Telemetry Badges */}
        <div className="flex items-center flex-wrap gap-1.5 text-[10px] font-mono">
          {/* 2-Second Live Pulse Toggle Button */}
          {onToggleLivePulse && (
            <button
              onClick={onToggleLivePulse}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${
                isLivePulse
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700"
              }`}
              title="Toggle 2-second live terminal pulse simulation"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLivePulse ? "bg-emerald-400 animate-ping" : "bg-slate-500"
                }`}
              />
              <span className="font-semibold text-[10px]">
                {isLivePulse ? "LIVE PULSE: ON (2s)" : "LIVE PULSE: PAUSED"}
              </span>
            </button>
          )}

          {/* Backend Online / Offline */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border whitespace-nowrap ${
              isBackendConnected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBackendConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span>{isBackendConnected ? "API ONLINE" : "API OFFLINE"}</span>
          </div>

          {/* Rate Limiter Status */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 whitespace-nowrap">
            <Activity className="w-3 h-3 text-sky-400 shrink-0" />
            <span>
              {cacheStatus ? `${cacheStatus.remaining_calls_per_minute}/5 REQ/MIN` : "5/5 REQ/MIN"}
            </span>
          </div>

          {/* SQLite Cache Badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 whitespace-nowrap">
            <Database className="w-3 h-3 text-purple-400 shrink-0" />
            <span>
              {cacheStatus ? `${cacheStatus.total_cached_entries} CACHED` : "CACHE READY"}
            </span>
          </div>

          {/* Feed Mode */}
          <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 whitespace-nowrap">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span>
              {cacheStatus?.has_live_polygon_key ? "POLYGON LIVE" : "SQLITE / SYNTHETIC"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

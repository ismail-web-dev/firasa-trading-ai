"use client";

import React, { useEffect, useState, useCallback } from "react";
import { TerminalHeader } from "@/components/TerminalHeader";
import { WatchlistSidebar } from "@/components/WatchlistSidebar";
import { TickerOverviewPanel } from "@/components/TickerOverviewPanel";
import { PortfolioPanel } from "@/components/PortfolioPanel";
import { AlertsPanel } from "@/components/AlertsPanel";
import { AIIntelligencePanel } from "@/components/AIIntelligencePanel";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

import {
  WatchlistItem,
  TickerQuote,
  MarketBarsResponse,
  TickerIndicatorsResponse,
  PortfolioSummaryResponse,
  HoldingCreateUpdate,
  AlertsSummaryResponse,
  AlertCreate,
  CacheStatus,
} from "@/types/market";
import {
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  fetchQuotes,
  fetchQuote,
  fetchBars,
  fetchIndicators,
  fetchCacheStatus,
  fetchPortfolio,
  savePortfolioHolding,
  updatePortfolioHolding,
  deletePortfolioHolding,
  fetchAlerts,
  createAlert,
  evaluateAlerts,
  updateAlert,
  deleteAlert,
} from "@/lib/api";
import { WifiOff, RefreshCw } from "lucide-react";

export default function TerminalPage() {
  const [activeTab, setActiveTab] = useState<string>("terminal");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, TickerQuote>>({});
  const [selectedTicker, setSelectedTicker] = useState<string>("AAPL");
  const [activeQuote, setActiveQuote] = useState<TickerQuote | null>(null);
  const [activeBars, setActiveBars] = useState<MarketBarsResponse | null>(null);
  const [activeIndicators, setActiveIndicators] =
    useState<TickerIndicatorsResponse | null>(null);
  const [days, setDays] = useState<number>(120);
  const [portfolio, setPortfolio] = useState<PortfolioSummaryResponse | null>(
    null
  );
  const [alertsData, setAlertsData] = useState<AlertsSummaryResponse | null>(
    null
  );
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState<boolean>(true);
  const [loadingActiveTicker, setLoadingActiveTicker] = useState<boolean>(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState<boolean>(false);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);

  // Load Watchlist and System Status
  const loadSystemAndWatchlist = useCallback(async () => {
    try {
      setLoadingWatchlist(true);
      const [items, status] = await Promise.all([
        fetchWatchlist().catch(() => null),
        fetchCacheStatus().catch(() => null),
      ]);

      if (items === null) {
        setIsBackendConnected(false);
        const fallbackItems: WatchlistItem[] = [
          { id: 1, ticker: "AAPL", company_name: "Apple Inc.", added_at: "" },
          { id: 2, ticker: "NVDA", company_name: "NVIDIA Corp.", added_at: "" },
          { id: 3, ticker: "MSFT", company_name: "Microsoft Corp.", added_at: "" },
          { id: 4, ticker: "GOOGL", company_name: "Alphabet Inc.", added_at: "" },
          { id: 5, ticker: "AMZN", company_name: "Amazon.com Inc.", added_at: "" },
        ];
        setWatchlist(fallbackItems);
      } else {
        setIsBackendConnected(true);
        setWatchlist(items);
        if (items.length > 0 && !items.some((i) => i.ticker === selectedTicker)) {
          setSelectedTicker(items[0].ticker);
        }
      }

      if (status) {
        setCacheStatus(status);
      }
    } catch {
      setIsBackendConnected(false);
    } finally {
      setLoadingWatchlist(false);
    }
  }, [selectedTicker]);

  // Load Portfolio Data
  const loadPortfolioData = useCallback(async () => {
    try {
      setLoadingPortfolio(true);
      const summary = await fetchPortfolio();
      setPortfolio(summary);
      setIsBackendConnected(true);
    } catch {
      // Offline fallback
    } finally {
      setLoadingPortfolio(false);
    }
  }, []);

  // Load Alerts Data
  const loadAlertsData = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const data = await fetchAlerts();
      setAlertsData(data);
      setIsBackendConnected(true);
    } catch {
      // Offline fallback
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // Load all quotes for watchlist items
  const loadWatchlistQuotes = useCallback(async (items: WatchlistItem[]) => {
    if (!items.length) return;
    try {
      const tickers = items.map((i) => i.ticker);
      const quotesList = await fetchQuotes(tickers);
      const quotesMap: Record<string, TickerQuote> = {};
      quotesList.forEach((q) => {
        quotesMap[q.ticker] = q;
      });
      setQuotes(quotesMap);
    } catch {
      // Ignored if backend offline
    }
  }, []);

  // Load active ticker data (quote, bars, and indicators)
  const loadActiveTickerData = useCallback(
    async (ticker: string, lookbackDays: number, forceRefresh: boolean = false) => {
      try {
        setLoadingActiveTicker(true);
        const [q, b, ind] = await Promise.all([
          fetchQuote(ticker).catch(() => null),
          fetchBars(ticker, lookbackDays, forceRefresh).catch(() => null),
          fetchIndicators(ticker, lookbackDays, forceRefresh).catch(() => null),
        ]);

        if (q) {
          setActiveQuote(q);
          setQuotes((prev) => ({ ...prev, [ticker]: q }));
          setIsBackendConnected(true);
        }
        if (b) {
          setActiveBars(b);
        }
        if (ind) {
          setActiveIndicators(ind);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingActiveTicker(false);
      }
    },
    []
  );

  useEffect(() => {
    loadSystemAndWatchlist();
    loadPortfolioData();
    loadAlertsData();
  }, [loadSystemAndWatchlist, loadPortfolioData, loadAlertsData]);

  useEffect(() => {
    if (watchlist.length > 0) {
      loadWatchlistQuotes(watchlist);
    }
  }, [watchlist, loadWatchlistQuotes]);

  useEffect(() => {
    if (selectedTicker) {
      loadActiveTickerData(selectedTicker, days);
    }
  }, [selectedTicker, days, loadActiveTickerData]);

  // Handler: Add to Watchlist
  const handleAddTicker = async (ticker: string, companyName?: string) => {
    const newItem = await addToWatchlist(ticker, companyName);
    setWatchlist((prev) => [...prev, newItem]);
    setSelectedTicker(newItem.ticker);
  };

  // Handler: Remove from Watchlist
  const handleRemoveTicker = async (ticker: string) => {
    await removeFromWatchlist(ticker);
    setWatchlist((prev) => prev.filter((i) => i.ticker !== ticker));
    if (selectedTicker === ticker) {
      const remaining = watchlist.filter((i) => i.ticker !== ticker);
      if (remaining.length > 0) {
        setSelectedTicker(remaining[0].ticker);
      }
    }
  };

  // Portfolio Handlers
  const handleSaveHolding = async (payload: HoldingCreateUpdate) => {
    const updated = await savePortfolioHolding(payload);
    setPortfolio(updated);
  };

  const handleUpdateHolding = async (id: number, payload: HoldingCreateUpdate) => {
    const updated = await updatePortfolioHolding(id, payload);
    setPortfolio(updated);
  };

  const handleDeleteHolding = async (id: number) => {
    const updated = await deletePortfolioHolding(id);
    setPortfolio(updated);
  };

  // Alerts Handlers
  const handleCreateAlert = async (payload: AlertCreate) => {
    const updated = await createAlert(payload);
    setAlertsData(updated);
  };

  const handleToggleAlert = async (id: number, isActive: boolean) => {
    const updated = await updateAlert(id, { is_active: isActive });
    setAlertsData(updated);
  };

  const handleResetAlert = async (id: number) => {
    const updated = await updateAlert(id, { reset_trigger: true });
    setAlertsData(updated);
  };

  const handleDeleteAlert = async (id: number) => {
    const updated = await deleteAlert(id);
    setAlertsData(updated);
  };

  const handleEvaluateAlerts = async () => {
    const updated = await evaluateAlerts();
    setAlertsData(updated);
  };

  return (
    <div className="flex flex-col min-h-screen bg-terminal-bg text-terminal-text">
      {/* Top Header */}
      <TerminalHeader
        isBackendConnected={isBackendConnected}
        cacheStatus={cacheStatus}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        triggeredAlertsCount={alertsData?.triggered_count || 0}
        onQuickJumpTicker={(ticker) => {
          setSelectedTicker(ticker);
          setActiveTab("terminal");
        }}
      />


      {/* Backend Offline Warning Banner if needed */}
      {!isBackendConnected && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between text-xs font-mono text-rose-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-400 animate-pulse flex-shrink-0" />
            <span>
              FastAPI backend is offline or starting up (http://localhost:8000). Start with:{" "}
              <code className="text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                backend/.venv/Scripts/python -m uvicorn main:app --reload
              </code>
            </span>
          </div>
          <button
            onClick={() => {
              loadSystemAndWatchlist();
              loadPortfolioData();
              loadAlertsData();
            }}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Workspace (Terminal vs Portfolio vs Alerts) */}
      {activeTab === "portfolio" ? (
        <div className="flex-1 flex overflow-hidden">
          <PortfolioPanel
            portfolio={portfolio}
            onSaveHolding={handleSaveHolding}
            onUpdateHolding={handleUpdateHolding}
            onDeleteHolding={handleDeleteHolding}
            onSelectTicker={(t) => {
              setSelectedTicker(t);
              setActiveTab("terminal");
            }}
            loading={loadingPortfolio}
          />
        </div>
      ) : activeTab === "alerts" ? (
        <div className="flex-1 flex overflow-hidden">
          <AlertsPanel
            alertsData={alertsData}
            onCreateAlert={handleCreateAlert}
            onToggleAlert={handleToggleAlert}
            onResetAlert={handleResetAlert}
            onDeleteAlert={handleDeleteAlert}
            onEvaluateAlerts={handleEvaluateAlerts}
            onSelectTicker={(t) => {
              setSelectedTicker(t);
              setActiveTab("terminal");
            }}
            loading={loadingAlerts}
          />
        </div>
      ) : activeTab === "ai" ? (
        <div className="flex-1 flex overflow-hidden">
          <AIIntelligencePanel
            initialTicker={selectedTicker}
            watchlistTickers={watchlist.map((i) => i.ticker)}
            onSelectTicker={(t) => {
              setSelectedTicker(t);
              setActiveTab("terminal");
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Watchlist Sidebar */}
          <WatchlistSidebar
            watchlist={watchlist}
            quotes={quotes}
            selectedTicker={selectedTicker}
            onSelectTicker={(ticker) => setSelectedTicker(ticker)}
            onAddTicker={handleAddTicker}
            onRemoveTicker={handleRemoveTicker}
            loading={loadingWatchlist}
          />

          {/* Ticker Overview & Chart Container */}
          <TickerOverviewPanel
            ticker={selectedTicker}
            quote={activeQuote || quotes[selectedTicker] || null}
            barsData={activeBars}
            indicators={activeIndicators}
            days={days}
            onDaysChange={(newDays) => setDays(newDays)}
            onRefresh={() => loadActiveTickerData(selectedTicker, days, true)}
            loading={loadingActiveTicker}
            onOpenAIAnalysis={(t) => {
              setSelectedTicker(t);
              setActiveTab("ai");
            }}
          />
        </div>
      )}


      {/* Disclaimer Footer */}
      <DisclaimerFooter />
    </div>
  );
}

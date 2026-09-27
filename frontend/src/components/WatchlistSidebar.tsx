import React, { useState } from "react";
import { WatchlistItem, TickerQuote } from "@/types/market";
import { Search, Plus, Trash2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface WatchlistSidebarProps {
  watchlist: WatchlistItem[];
  quotes: Record<string, TickerQuote>;
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  onAddTicker: (ticker: string, companyName?: string) => Promise<void>;
  onRemoveTicker: (ticker: string) => Promise<void>;
  loading: boolean;
  tickDirections?: Record<string, "up" | "down" | "flat">;
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  watchlist,
  quotes,
  selectedTicker,
  onSelectTicker,
  onAddTicker,
  onRemoveTicker,
  loading,
  tickDirections,
}) => {

  const [filterQuery, setFilterQuery] = useState("");
  const [newTicker, setNewTicker] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanTicker = newTicker.trim().toUpperCase();

    if (!cleanTicker) {
      setFormError("Please enter a ticker symbol.");
      return;
    }

    if (!/^[A-Z0-9.-]{1,10}$/.test(cleanTicker)) {
      setFormError("Ticker must be 1-10 alphanumeric characters.");
      return;
    }

    if (watchlist.some((item) => item.ticker === cleanTicker)) {
      setFormError(`'${cleanTicker}' is already in your watchlist.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddTicker(cleanTicker, companyName.trim() || undefined);
      setNewTicker("");
      setCompanyName("");
    } catch (err: any) {
      setFormError(err.message || "Failed to add ticker");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = watchlist.filter((item) => {
    const q = filterQuery.toLowerCase();
    return (
      item.ticker.toLowerCase().includes(q) ||
      (item.company_name && item.company_name.toLowerCase().includes(q))
    );
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-terminal-border bg-terminal-panel flex flex-col h-[calc(100vh-100px)]">
      {/* Search & Header */}
      <div className="p-3 border-b border-terminal-border space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            WATCHLIST ({watchlist.length})
          </span>
          {loading && (
            <span className="text-[10px] text-sky-400 font-mono animate-pulse">
              Syncing...
            </span>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-terminal-muted" />
          <input
            type="text"
            placeholder="Search symbol or company..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Add Ticker Form */}
      <form onSubmit={handleAddSubmit} className="p-3 border-b border-terminal-border bg-slate-900/50 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="TICKER (e.g. AMD)"
            value={newTicker}
            onChange={(e) => {
              setNewTicker(e.target.value.toUpperCase());
              setFormError(null);
            }}
            maxLength={10}
            className="w-1/2 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono uppercase text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="Name (Optional)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-1/2 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !newTicker.trim()}
          className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-600 text-white rounded py-1.5 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isSubmitting ? "Adding..." : "+ Add to Watchlist"}</span>
        </button>

        {formError && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{formError}</span>
          </div>
        )}
      </form>

      {/* Watchlist Items Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-terminal-muted">
            {filterQuery ? "No matching tickers found." : "No tickers in watchlist."}
          </div>
        ) : (
          filteredItems.map((item) => {
            const quote = quotes[item.ticker];
            const isSelected = selectedTicker === item.ticker;
            const isPositive = quote ? quote.change >= 0 : true;
            const tickDir = tickDirections?.[item.ticker] || "flat";

            return (
              <div
                key={item.id}
                onClick={() => onSelectTicker(item.ticker)}
                className={`group flex items-center justify-between p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-sky-500/10 border-l-2 border-sky-400"
                    : "hover:bg-slate-800/50"
                }`}
              >
                {/* Ticker & Name */}
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-100 group-hover:text-sky-300">
                      {item.ticker}
                    </span>
                    {quote?.cached && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        C
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {item.company_name || quote?.company_name || "—"}
                  </p>
                </div>

                {/* Price & Change */}
                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <div
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded transition-all duration-500 inline-block ${
                        tickDir === "up"
                          ? "text-emerald-400 bg-emerald-500/20"
                          : tickDir === "down"
                          ? "text-rose-400 bg-rose-500/20"
                          : "text-slate-200"
                      }`}
                    >
                      {quote ? `$${quote.price.toFixed(2)}` : "—"}
                    </div>
                    {quote ? (
                      <div
                        className={`text-[10px] flex items-center justify-end gap-0.5 font-medium ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        <span>
                          {isPositive ? "+" : ""}
                          {quote.change_percent.toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">...</span>
                    )}
                  </div>


                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(`Remove ${item.ticker} from watchlist?`)
                      ) {
                        onRemoveTicker(item.ticker);
                      }
                    }}
                    title={`Remove ${item.ticker}`}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

import React from "react";
import { AlertTriangle } from "lucide-react";

export const DisclaimerFooter: React.FC = () => {
  const notice =
    process.env.NEXT_PUBLIC_DATA_DELAY_NOTICE ||
    "15-minute delayed data. For investment research and decision support only. No brokerage execution or financial advice.";

  return (
    <footer className="border-t border-terminal-border bg-slate-950 px-4 py-2 text-[11px] font-mono text-terminal-muted flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 overflow-hidden truncate">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="truncate">{notice}</span>
      </div>
      <div className="hidden md:flex items-center gap-2 text-slate-500 flex-shrink-0">
        <span>FIRASA v0.1</span>
        <span>•</span>
        <span>FastAPI + SQLite + Next.js</span>
      </div>
    </footer>
  );
};

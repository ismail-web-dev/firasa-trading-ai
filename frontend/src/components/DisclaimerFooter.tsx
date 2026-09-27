import React from "react";
import { AlertTriangle, Github } from "lucide-react";

export const DisclaimerFooter: React.FC = () => {
  const notice =
    process.env.NEXT_PUBLIC_DATA_DELAY_NOTICE ||
    "15-minute delayed data. For investment research and decision support only. No brokerage execution.";

  return (
    <footer className="border-t border-terminal-border bg-slate-950 px-3 md:px-4 py-2 text-[11px] font-mono text-terminal-muted flex flex-col md:flex-row items-center justify-between gap-2">
      <div className="flex items-center gap-2 overflow-hidden truncate">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate">{notice}</span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
        <span>© 2026 FIRASA (فراسة) • Engineered by Muhammad Ismail • Saylani Vibe Engineering</span>
        <span>•</span>
        <a
          href="https://github.com/ismail-web-dev/firasa-trading-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1 transition-colors"
        >
          <Github className="w-3 h-3" />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  );
};

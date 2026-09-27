import React from "react";
import Link from "next/link";
import { Terminal, ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono flex flex-col items-center justify-between p-4 md:p-8">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs tracking-wider">
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="1" y="1" width="30" height="30" rx="6" fill="#090d16" stroke="#38bdf8" strokeWidth="1.5" />
              <path d="M10 11 Q 16 6 23 8.5" fill="none" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" opacity="0.6" strokeDasharray="1.5 1.5" />
              <line x1="10" y1="7" x2="10" y2="25" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />
              <rect x="8" y="11" width="4" height="10" rx="0.8" fill="#10b981" />
              <line x1="17" y1="9" x2="17" y2="26" stroke="#f43f5e" strokeWidth="1.2" strokeLinecap="round" />
              <rect x="15" y="13" width="4" height="8" rx="0.8" fill="#f43f5e" />
              <path d="M23 4.5 L24.2 7.5 L27.2 8.5 L24.2 9.5 L23 12.5 L21.8 9.5 L18.8 8.5 L21.8 7.5 Z" fill="#38bdf8" />
              <circle cx="23" cy="8.5" r="1" fill="#ffffff" />
            </svg>
            <span>FIRASA // فراسة</span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            ROUTING GATEWAY
          </span>
        </div>

        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
          ERR_HTTP_404
        </div>
      </div>

      {/* Main Error Terminal Card */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-lg p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              404 // ROUTE_NOT_FOUND
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              The requested routing address could not be resolved by the FIRASA edge gateway.
            </p>
          </div>
        </div>

        {/* Diagnostic Telemetry Block */}
        <div className="bg-slate-950 border border-slate-800/80 rounded p-4 text-xs space-y-2 text-slate-400">
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-800 text-slate-300">
            <span className="text-sky-400 font-semibold">&gt; SYSTEM_DIAGNOSTICS</span>
            <span className="text-[10px] text-slate-500">GATEWAY_TELEMETRY</span>
          </div>
          <div className="flex justify-between">
            <span>STATUS:</span>
            <span className="text-rose-400 font-bold">404 NOT FOUND</span>
          </div>
          <div className="flex justify-between">
            <span>RESOLVER:</span>
            <span className="text-slate-300">Next.js Edge App Router</span>
          </div>
          <div className="flex justify-between">
            <span>ENVIRONMENT:</span>
            <span className="text-emerald-400">Hostinger Cloud Production</span>
          </div>
          <div className="flex justify-between">
            <span>ACTION:</span>
            <span className="text-sky-300">Return to primary market intelligence workspace</span>
          </div>
        </div>

        {/* Return to Terminal Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-colors text-xs shadow-md group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Terminal Workspace</span>
          </Link>
        </div>
      </div>

      {/* Footer Attribution */}
      <div className="w-full max-w-4xl text-center text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
        © 2026 FIRASA (فراسة) • Engineered by Muhammad Ismail • Saylani Vibe Engineering
      </div>
    </div>
  );
}

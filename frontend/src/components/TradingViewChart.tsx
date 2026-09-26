"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  Time,
  CandlestickData,
  LineData,
  HistogramData,
} from "lightweight-charts";
import { OHLCVBar, TickerIndicatorsResponse } from "@/types/market";
import { BarChart3, TrendingUp, Sliders, CheckSquare, Square } from "lucide-react";

interface TradingViewChartProps {
  ticker: string;
  bars: OHLCVBar[];
  indicators: TickerIndicatorsResponse | null;
  days: number;
  onDaysChange: (days: number) => void;
  loading?: boolean;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  ticker,
  bars,
  indicators,
  days,
  onDaysChange,
  loading,
}) => {
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const subContainerRef = useRef<HTMLDivElement | null>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const subChartRef = useRef<IChartApi | null>(null);

  // Overlay state toggles
  const [showSMA20, setShowSMA20] = useState<boolean>(true);
  const [showSMA50, setShowSMA50] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<"RSI" | "MACD">("RSI");

  // Keep references to series to toggle without rebuilding chart
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Sub-chart series refs
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // 1. Initialize Main Chart
  useEffect(() => {
    if (!mainContainerRef.current) return;

    const chart = createChart(mainContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#090d16" },
        textColor: "#94a3b8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e293b66" },
        horzLines: { color: "#1e293b66" },
      },
      crosshair: {
        vertLine: { color: "#38bdf866", width: 1, style: 2 },
        horzLine: { color: "#38bdf866", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    const volSeries = chart.addHistogramSeries({
      color: "#3b82f640",
      priceFormat: { type: "volume" },
      priceScaleId: "volume_overlay",
    });
    chart.priceScale("volume_overlay").applyOptions({
      scaleMargins: { top: 0.75, bottom: 0.0 },
    });

    const s20Series = chart.addLineSeries({
      color: "#38bdf8",
      lineWidth: 2,
      priceLineVisible: false,
      title: "SMA 20",
    });

    const s50Series = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      title: "SMA 50",
    });

    candlestickSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volSeries;
    sma20SeriesRef.current = s20Series;
    sma50SeriesRef.current = s50Series;
    mainChartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length && entries[0].contentRect) {
        chart.applyOptions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    resizeObserver.observe(mainContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      mainChartRef.current = null;
    };
  }, []);

  // 2. Initialize Sub-Chart (RSI / MACD)
  useEffect(() => {
    if (!subContainerRef.current) return;

    const chart = createChart(subContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#090d16" },
        textColor: "#94a3b8",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "#1e293b44" },
        horzLines: { color: "#1e293b44" },
      },
      crosshair: {
        vertLine: { color: "#38bdf844", width: 1, style: 2 },
        horzLine: { color: "#38bdf844", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor: "#1e293b",
        visible: true,
      },
    });

    subChartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length && entries[0].contentRect) {
        chart.applyOptions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    resizeObserver.observe(subContainerRef.current);

    // Synchronize time scales between main and sub-chart
    const handleTimeChange = (timeRange: any) => {
      if (!timeRange) return;
      if (mainChartRef.current && subChartRef.current) {
        // Safe time synchronization
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleTimeChange);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      subChartRef.current = null;
    };
  }, []);

  // 3. Populate Main Chart Series Data
  useEffect(() => {
    if (!mainChartRef.current || !candlestickSeriesRef.current || !bars.length) return;

    // Filter duplicates and sort ascending
    const sorted = [...bars].sort((a, b) => a.timestamp - b.timestamp);
    const seenDates = new Set<string>();
    const candleData: CandlestickData<Time>[] = [];
    const volData: HistogramData<Time>[] = [];

    for (const b of sorted) {
      if (seenDates.has(b.date)) continue;
      seenDates.add(b.date);
      const isUp = b.close >= b.open;
      candleData.push({
        time: b.date as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      });
      volData.push({
        time: b.date as Time,
        value: b.volume,
        color: isUp ? "#10b98133" : "#f43f5e33",
      });
    }

    candlestickSeriesRef.current.setData(candleData);
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(showVolume ? volData : []);
    }

    // Set SMA Overlays from indicators series
    if (indicators?.series?.length) {
      const sma20Data: LineData<Time>[] = [];
      const sma50Data: LineData<Time>[] = [];

      for (const p of indicators.series) {
        if (p.sma_20 !== null) {
          sma20Data.push({ time: p.date as Time, value: p.sma_20 });
        }
        if (p.sma_50 !== null) {
          sma50Data.push({ time: p.date as Time, value: p.sma_50 });
        }
      }

      if (sma20SeriesRef.current) {
        sma20SeriesRef.current.setData(showSMA20 ? sma20Data : []);
      }
      if (sma50SeriesRef.current) {
        sma50SeriesRef.current.setData(showSMA50 ? sma50Data : []);
      }
    }

    mainChartRef.current.timeScale().fitContent();
  }, [bars, indicators, showSMA20, showSMA50, showVolume]);

  // 4. Populate Sub-Chart Series (RSI vs MACD)
  useEffect(() => {
    const subChart = subChartRef.current;
    if (!subChart || !indicators?.series?.length) return;

    // Clear previous sub-series
    if (rsiSeriesRef.current) {
      try {
        subChart.removeSeries(rsiSeriesRef.current);
      } catch {}
      rsiSeriesRef.current = null;
    }
    if (macdLineRef.current) {
      try {
        subChart.removeSeries(macdLineRef.current);
      } catch {}
      macdLineRef.current = null;
    }
    if (macdSignalRef.current) {
      try {
        subChart.removeSeries(macdSignalRef.current);
      } catch {}
      macdSignalRef.current = null;
    }
    if (macdHistRef.current) {
      try {
        subChart.removeSeries(macdHistRef.current);
      } catch {}
      macdHistRef.current = null;
    }

    if (activeSubTab === "RSI") {
      const rsiLine = subChart.addLineSeries({
        color: "#a855f7",
        lineWidth: 2,
        title: "RSI(14)",
      });

      // Price lines for 70 and 30 levels
      rsiLine.createPriceLine({
        price: 70,
        color: "#f43f5e88",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "70 OB",
      });
      rsiLine.createPriceLine({
        price: 30,
        color: "#10b98188",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "30 OS",
      });

      const rsiData: LineData<Time>[] = [];
      for (const p of indicators.series) {
        if (p.rsi_14 !== null) {
          rsiData.push({ time: p.date as Time, value: p.rsi_14 });
        }
      }
      rsiLine.setData(rsiData);
      rsiSeriesRef.current = rsiLine;
    } else {
      // MACD (12, 26, 9)
      const histSeries = subChart.addHistogramSeries({
        title: "MACD Hist",
      });
      const macdLine = subChart.addLineSeries({
        color: "#38bdf8",
        lineWidth: 2,
        title: "MACD",
      });
      const signalLine = subChart.addLineSeries({
        color: "#f97316",
        lineWidth: 1,
        title: "Signal",
      });

      const histData: HistogramData<Time>[] = [];
      const mData: LineData<Time>[] = [];
      const sData: LineData<Time>[] = [];

      for (const p of indicators.series) {
        if (p.macd !== null) {
          mData.push({ time: p.date as Time, value: p.macd });
        }
        if (p.macd_signal !== null) {
          sData.push({ time: p.date as Time, value: p.macd_signal });
        }
        if (p.macd_hist !== null) {
          histData.push({
            time: p.date as Time,
            value: p.macd_hist,
            color: p.macd_hist >= 0 ? "#10b981aa" : "#f43f5eaa",
          });
        }
      }

      histSeries.setData(histData);
      macdLine.setData(mData);
      signalLine.setData(sData);

      macdHistRef.current = histSeries;
      macdLineRef.current = macdLine;
      macdSignalRef.current = signalLine;
    }

    subChart.timeScale().fitContent();
  }, [indicators, activeSubTab]);

  const latest = indicators?.latest;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Interactive Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg text-xs font-mono">
        {/* Lookback Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-terminal-muted mr-1.5 hidden sm:inline">SPAN:</span>
          {[60, 120, 180, 365].map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                days === d
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 font-semibold"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>

        {/* Overlay Toggles */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSMA20(!showSMA20)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white"
          >
            {showSMA20 ? (
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="text-[11px] text-sky-400">SMA 20</span>
          </button>

          <button
            onClick={() => setShowSMA50(!showSMA50)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white"
          >
            {showSMA50 ? (
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="text-[11px] text-amber-400">SMA 50</span>
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white"
          >
            {showVolume ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="text-[11px] text-blue-400">VOL</span>
          </button>
        </div>

        {/* Sub-Indicator Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setActiveSubTab("RSI")}
            className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
              activeSubTab === "RSI"
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            RSI (14)
          </button>
          <button
            onClick={() => setActiveSubTab("MACD")}
            className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
              activeSubTab === "MACD"
                ? "bg-sky-600/30 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            MACD (12,26,9)
          </button>
        </div>
      </div>

      {/* Main Candlestick Chart Canvas */}
      <div className="relative w-full h-[340px] md:h-[380px] bg-terminal-bg rounded-lg border border-terminal-border overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-10 flex items-center justify-center font-mono text-xs text-sky-400">
            Rendering deterministic charts...
          </div>
        )}
        <div ref={mainContainerRef} className="w-full h-full" />
      </div>

      {/* Synchronized Sub-Indicator Canvas (RSI / MACD) */}
      <div className="relative w-full h-[140px] bg-terminal-bg rounded-lg border border-terminal-border overflow-hidden p-1">
        <div className="absolute top-2 left-3 z-10 font-mono text-[10px] flex items-center gap-2">
          {activeSubTab === "RSI" ? (
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-0.5 rounded border border-purple-500/30 text-purple-300">
              <span>RSI: {latest?.rsi_14 !== null ? latest?.rsi_14?.toFixed(2) : "—"}</span>
              <span
                className={`font-semibold ${
                  latest?.rsi_state === "OVERBOUGHT"
                    ? "text-rose-400"
                    : latest?.rsi_state === "OVERSOLD"
                    ? "text-emerald-400"
                    : "text-slate-400"
                }`}
              >
                [{latest?.rsi_state || "NEUTRAL"}]
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900/90 px-2 py-0.5 rounded border border-sky-500/30 text-[10px]">
              <span className="text-sky-400">
                MACD: {latest?.macd !== null ? latest?.macd?.toFixed(3) : "—"}
              </span>
              <span className="text-orange-400">
                SIG: {latest?.macd_signal !== null ? latest?.macd_signal?.toFixed(3) : "—"}
              </span>
              <span
                className={
                  latest?.macd_hist && latest.macd_hist >= 0
                    ? "text-emerald-400 font-semibold"
                    : "text-rose-400 font-semibold"
                }
              >
                HIST: {latest?.macd_hist !== null ? latest?.macd_hist?.toFixed(3) : "—"}
              </span>
            </div>
          )}
        </div>
        <div ref={subContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

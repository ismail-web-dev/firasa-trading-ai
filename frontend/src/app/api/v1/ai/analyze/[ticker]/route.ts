import { NextRequest, NextResponse } from "next/server";
import { analyzeMarketTicker } from "@/lib/server-engine";

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params;
    if (!ticker) {
      return NextResponse.json({ detail: "Ticker param is required" }, { status: 400 });
    }
    const analysis = await analyzeMarketTicker(ticker);
    return NextResponse.json(analysis);
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to analyze ticker" }, { status });
  }
}

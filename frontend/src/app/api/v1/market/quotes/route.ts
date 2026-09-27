import { NextRequest, NextResponse } from "next/server";
import { getQuotes } from "@/lib/server-engine";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const tickersParam = searchParams.get("tickers");
    const tickers = tickersParam ? tickersParam.split(",").map((t) => t.trim()) : undefined;
    const quotes = await getQuotes(tickers);
    return NextResponse.json(quotes);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to fetch quotes" }, { status: 500 });
  }
}

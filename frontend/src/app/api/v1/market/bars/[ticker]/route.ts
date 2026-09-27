import { NextRequest, NextResponse } from "next/server";
import { getDailyBars } from "@/lib/server-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params;
    if (!ticker) {
      return NextResponse.json({ detail: "Ticker param is required" }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "90", 10);
    const forceRefresh = searchParams.get("force_refresh") === "true";

    const data = await getDailyBars(ticker, isNaN(days) ? 90 : days, forceRefresh);
    return NextResponse.json(data);
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to fetch bars" }, { status });
  }
}

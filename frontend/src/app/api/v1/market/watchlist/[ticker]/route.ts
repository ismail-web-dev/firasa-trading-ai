import { NextRequest, NextResponse } from "next/server";
import { removeFromWatchlist } from "@/lib/server-engine";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params;
    if (!ticker) {
      return NextResponse.json({ detail: "Ticker param is required" }, { status: 400 });
    }
    removeFromWatchlist(ticker);
    return NextResponse.json({ status: "success", message: `Removed ${ticker.toUpperCase()}` });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to remove from watchlist" }, { status });
  }
}

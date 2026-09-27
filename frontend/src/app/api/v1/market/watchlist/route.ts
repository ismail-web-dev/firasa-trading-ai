import { NextRequest, NextResponse } from "next/server";
import { listWatchlist, addToWatchlist } from "@/lib/server-engine";

export async function GET() {
  const items = listWatchlist();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.ticker || typeof body.ticker !== "string") {
      return NextResponse.json(
        { detail: "Field 'ticker' is required and must be a string." },
        { status: 400 }
      );
    }
    const item = addToWatchlist(body.ticker, body.company_name);
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to add to watchlist" }, { status });
  }
}

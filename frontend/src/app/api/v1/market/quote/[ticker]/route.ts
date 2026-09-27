import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/server-engine";

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params;
    if (!ticker) {
      return NextResponse.json({ detail: "Ticker param is required" }, { status: 400 });
    }
    const quote = await getQuote(ticker);
    return NextResponse.json(quote);
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to fetch quote" }, { status });
  }
}

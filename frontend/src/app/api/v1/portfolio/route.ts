import { NextRequest, NextResponse } from "next/server";
import { getPortfolioSummary, upsertHolding } from "@/lib/server-engine";

export async function GET() {
  try {
    const summary = await getPortfolioSummary();
    return NextResponse.json(summary);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to load portfolio" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.ticker || body.shares === undefined || body.avg_cost_basis === undefined) {
      return NextResponse.json(
        { detail: "Fields 'ticker', 'shares', and 'avg_cost_basis' are required." },
        { status: 400 }
      );
    }
    const summary = await upsertHolding({
      ticker: body.ticker,
      shares: Number(body.shares),
      avg_cost_basis: Number(body.avg_cost_basis),
      notes: body.notes || null,
    });
    return NextResponse.json(summary, { status: 201 });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to save holding" }, { status });
  }
}

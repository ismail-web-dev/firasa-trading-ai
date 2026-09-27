import { NextRequest, NextResponse } from "next/server";
import { getAlertsSummary, createAlertRule } from "@/lib/server-engine";

export async function GET() {
  try {
    const summary = await getAlertsSummary();
    return NextResponse.json(summary);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to load alerts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.ticker || !body.condition_type || body.threshold_value === undefined) {
      return NextResponse.json(
        { detail: "Fields 'ticker', 'condition_type', and 'threshold_value' are required." },
        { status: 400 }
      );
    }
    const summary = await createAlertRule({
      ticker: body.ticker,
      condition_type: body.condition_type,
      threshold_value: Number(body.threshold_value),
    });
    return NextResponse.json(summary, { status: 201 });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to create alert" }, { status });
  }
}

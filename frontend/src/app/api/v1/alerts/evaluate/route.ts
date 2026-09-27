import { NextResponse } from "next/server";
import { getAlertsSummary } from "@/lib/server-engine";

export async function POST() {
  try {
    const summary = await getAlertsSummary();
    return NextResponse.json(summary);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to evaluate alerts" }, { status: 500 });
  }
}

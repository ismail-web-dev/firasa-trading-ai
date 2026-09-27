import { NextResponse } from "next/server";
import { auditPortfolioRisk } from "@/lib/server-engine";

export async function GET() {
  try {
    const audit = await auditPortfolioRisk();
    return NextResponse.json(audit);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to audit portfolio" }, { status: 500 });
  }
}

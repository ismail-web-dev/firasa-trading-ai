import { NextResponse } from "next/server";
import { scanOpportunities } from "@/lib/server-engine";

export async function GET() {
  try {
    const scan = await scanOpportunities();
    return NextResponse.json(scan);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to scan opportunities" }, { status: 500 });
  }
}

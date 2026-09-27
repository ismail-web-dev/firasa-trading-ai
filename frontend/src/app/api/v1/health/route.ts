import { NextResponse } from "next/server";
import { DATA_DELAY_DISCLAIMER } from "@/lib/server-engine";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "FIRASA Market Intelligence API (Next.js Node.js)",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    data_delay_notice: DATA_DELAY_DISCLAIMER,
  });
}

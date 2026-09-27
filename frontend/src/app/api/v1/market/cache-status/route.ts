import { NextResponse } from "next/server";
import { getCacheStatus } from "@/lib/server-engine";

export async function GET() {
  const status = getCacheStatus();
  return NextResponse.json(status);
}

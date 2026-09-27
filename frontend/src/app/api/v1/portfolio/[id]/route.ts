import { NextRequest, NextResponse } from "next/server";
import { updateHoldingById, deleteHoldingById } from "@/lib/server-engine";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ detail: "Valid holding ID required" }, { status: 400 });
    }
    const body = await req.json();
    const summary = await updateHoldingById(id, {
      ticker: body.ticker,
      shares: Number(body.shares),
      avg_cost_basis: Number(body.avg_cost_basis),
      notes: body.notes || null,
    });
    return NextResponse.json(summary);
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to update holding" }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ detail: "Valid holding ID required" }, { status: 400 });
    }
    const summary = await deleteHoldingById(id);
    return NextResponse.json(summary);
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to delete holding" }, { status });
  }
}

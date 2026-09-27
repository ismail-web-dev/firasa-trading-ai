import { NextRequest, NextResponse } from "next/server";
import { updateAlertRule, deleteAlertRule } from "@/lib/server-engine";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ detail: "Valid alert ID required" }, { status: 400 });
    }
    const body = await req.json();
    const summary = await updateAlertRule(id, {
      is_active: body.is_active,
      reset_trigger: body.reset_trigger,
    });
    return NextResponse.json(summary);
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to update alert" }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ detail: "Valid alert ID required" }, { status: 400 });
    }
    const summary = await deleteAlertRule(id);
    return NextResponse.json(summary);
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ detail: err.message || "Failed to delete alert" }, { status });
  }
}

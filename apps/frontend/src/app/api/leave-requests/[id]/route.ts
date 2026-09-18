import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

const STATUSES = ["pending", "approved", "rejected"];

// PATCH — approve/reject a leave request (CMS leave view action buttons)
export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.status === "string" && STATUSES.includes(body.status)) data.status = body.status;
    if (typeof body.reason === "string") data.reason = body.reason;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const leave = await db.leaveRequest.update({
      where: { id },
      data,
      include: { staff: { select: { id: true, name: true, email: true, department: true } } },
    });
    return NextResponse.json(leave);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }
    console.error("[PATCH /api/leave-requests/[id]]", error);
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await db.leaveRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }
    console.error("[DELETE /api/leave-requests/[id]]", error);
    return NextResponse.json({ error: "Failed to delete leave request" }, { status: 500 });
  }
});

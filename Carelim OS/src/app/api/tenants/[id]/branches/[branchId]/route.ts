import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; branchId: string }> }) {
  const { id, branchId } = await params;
  const body = await req.json();
  const branch = await db.branch.update({ where: { id: branchId }, data: body });
  return NextResponse.json(branch);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; branchId: string }> }) {
  const { id, branchId } = await params;
  const branch = await db.branch.findUnique({ where: { id: branchId } });
  await db.branch.delete({ where: { id: branchId } });
  await db.saaSAuditLog.create({
    data: { adminEmail: "admin@carelim.com", tenantId: id, action: "DELETE", module: "Branches", detail: `Deleted branch: ${branch?.name || branchId}` },
  });
  return NextResponse.json({ ok: true });
}

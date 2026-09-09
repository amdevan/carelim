import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, hashPassword } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.joinDate) data.joinDate = new Date(body.joinDate);
  // Hash password if being updated
  if (body.password) {
    data.password = await hashPassword(body.password);
  } else {
    // Don't pass password field if not updating it
    delete data.password;
  }
  // Handle multi-branch assignment
  const branchIds: string[] | undefined = body.branchIds;
  if (branchIds !== undefined) {
    const primaryBranchId = branchIds[0] || null;
    data.branchId = primaryBranchId;
    delete data.branchIds;
    // Delete existing and recreate
    await db.staffBranch.deleteMany({ where: { staffId: id } });
    if (branchIds.length > 0) {
      await db.staffBranch.createMany({
        data: branchIds.map((bid: string) => ({ staffId: id, branchId: bid })),
      });
    }
  } else {
    delete data.branchIds;
  }
  const staff = await db.staff.update({
    where: { id },
    data,
    include: { staffBranches: { select: { branchId: true, branch: { select: { id: true, name: true } } } } },
  });
  // Don't return password in response
  const { password: _, ...staffWithoutPassword } = staff as any;
  return NextResponse.json(staffWithoutPassword);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.staff.delete({ where: { id } });
  await db.auditLog.create({ data: { user: getAuthEmail(_req), action: "DELETE", module: "Staff", detail: "Removed employee" } });
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, hashPassword } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

const STAFF_UPDATABLE = new Set([
  "name", "email", "phone", "gender", "role", "department", "specialization",
  "qualification", "experience", "licenseNumber", "consultationFee", "commissionPct",
  "dateOfBirth", "joinDate", "address", "city", "state", "country", "zipCode",
  "emergencyContact", "emergencyPhone", "avatar", "signature", "status",
  "bankName", "bankAccount", "taxId", "notes",
]);

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const key of STAFF_UPDATABLE) {
      if (key in body) data[key] = body[key];
    }
    if (body.joinDate) data.joinDate = new Date(body.joinDate);
    // Hash password if being updated
    if (body.password) {
      if (body.password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      data.password = await hashPassword(body.password);
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
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
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.staff.delete({ where: { id } });
  await db.auditLog.create({ data: { user: getAuthEmail(_req), action: "DELETE", module: "Staff", detail: "Removed employee" } });
  return NextResponse.json({ ok: true });
});

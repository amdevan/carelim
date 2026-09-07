import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const branchFilter = branchId ? { branchId } : {};
  const [staff, departments, prescriptions] = await Promise.all([
    db.staff.findMany({ where: branchFilter, include: { attendance: { orderBy: { date: "desc" }, take: 7 }, leaveRequests: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: branchFilter, include: { _count: { select: { doctors: true } } } }),
    db.prescription.findMany({ where: branchFilter, include: { patient: true, doctor: { include: { department: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return NextResponse.json({ staff, departments, prescriptions });
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const staff = await db.staff.create({
    data: { ...body, joinDate: body.joinDate ? new Date(body.joinDate) : new Date() },
  });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Staff", detail: `Added employee ${staff.name}` } });
  return NextResponse.json(staff, { status: 201 });
});

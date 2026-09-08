import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, hashPassword } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const branchFilter = branchId ? { branchId } : {};
  const [staff, departments, prescriptions] = await Promise.all([
    db.staff.findMany({ where: branchFilter, select: { id: true, tenantId: true, branchId: true, name: true, email: true, phone: true, role: true, department: true, designation: true, salary: true, joinDate: true, status: true, lastLogin: true, attendance: { orderBy: { date: "desc" }, take: 7 }, leaveRequests: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: branchFilter, include: { _count: { select: { doctors: true } } } }),
    db.prescription.findMany({ where: branchFilter, include: { patient: true, doctor: { include: { department: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return NextResponse.json({ staff, departments, prescriptions });
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const body = await req.json();
    // Hash password if provided, otherwise use default
    const hashedPassword = body.password
      ? await hashPassword(body.password)
      : await hashPassword("medcore123");
    // Clean empty strings to null for nullable fields
    const staff = await db.staff.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || "",
        role: body.role || "receptionist",
        department: body.department || null,
        designation: body.designation || null,
        branchId: body.branchId || null,
        password: hashedPassword,
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
      },
    });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Staff", detail: `Added employee ${staff.name}` } });
    // Don't return password in response
    const { password: _, ...staffWithoutPassword } = staff as any;
    return NextResponse.json(staffWithoutPassword, { status: 201 });
  } catch (error: any) {
    console.error("Staff create error:", error?.name, error?.message, error?.code);
    return NextResponse.json({ error: error?.message || "Failed to create staff" }, { status: 500 });
  }
});

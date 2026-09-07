import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const deptId = searchParams.get("departmentId");
    const branchId = searchParams.get("branchId");
    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    if (q) where.OR = [{ name: { contains: q } }, { specialization: { contains: q } }, { email: { contains: q } }];
    if (deptId) where.departmentId = deptId;
    const doctors = await db.doctor.findMany({
      where,
      include: { department: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 });
  }
});

export const POST = withTenant(async (req: NextRequest) => {
  const denied = await requirePermission(req, "Doctor", "create");
  if (denied) return denied;
  try {
    const body = await req.json();
    const doctor = await db.doctor.create({ data: body });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Doctor", detail: `Added doctor ${doctor.name}` } });
    return NextResponse.json(doctor, { status: 201 });
  } catch (error) {
    console.error("Error creating doctor:", error);
    return NextResponse.json({ error: "Failed to create doctor" }, { status: 500 });
  }
});

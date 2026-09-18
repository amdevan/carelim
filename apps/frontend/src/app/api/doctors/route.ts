import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, hashPassword } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";

/** Strip password hash before returning a doctor to any client */
function toSafe(doctor: Record<string, unknown>) {
  const { password: _pw, ...safe } = doctor;
  return safe;
}

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
    return NextResponse.json((doctors as unknown as Record<string, unknown>[]).map(toSafe));
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
    // Only pick valid Doctor fields to avoid Prisma validation errors
    const data: Record<string, unknown> = {};
    const validFields = [
      "name", "email", "phone", "gender", "qualification", "specialization",
      "departmentId", "licenseNumber", "branchId",
      "experience", "consultationFee", "commissionPct", "rating",
      "workingDays", "startTime", "endTime", "status",
      "avatar", "signature", "password",
    ];
    for (const key of validFields) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        data[key] = body[key];
      }
    }
    // Required fields with defaults
    if (!data.specialization) data.specialization = "General";
    if (!data.licenseNumber) data.licenseNumber = "";
    if (!data.phone) data.phone = "";
    // password is required by the schema but the UI doesn't collect it —
    // default login password "Doctor@123"; hash whatever we store
    data.password = await hashPassword(
      typeof data.password === "string" && data.password ? data.password : "Doctor@123"
    );
    const doctor = await db.doctor.create({ data: data as never });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Doctor", detail: `Added doctor ${doctor.name}` } });
    return NextResponse.json(toSafe(doctor as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error("Error creating doctor:", error);
    const msg = error instanceof Error ? error.message : "Failed to create doctor";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A doctor with this email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

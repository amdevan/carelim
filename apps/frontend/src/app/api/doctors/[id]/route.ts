import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

/** Strip password hash before returning a doctor to any client */
function toSafe(doctor: Record<string, unknown>) {
  const { password: _pw, ...safe } = doctor;
  return safe;
}

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const doctor = await db.doctor.findUnique({
      where: { id },
      include: { department: true, appointments: { include: { patient: true }, orderBy: { date: "desc" }, take: 20 } },
    });
    if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toSafe(doctor as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Error fetching doctor:", error);
    return NextResponse.json({ error: "Failed to fetch doctor" }, { status: 500 });
  }
});

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const validFields = [
      "name", "email", "phone", "gender", "qualification", "specialization",
      "departmentId", "licenseNumber", "branchId",
      "experience", "consultationFee", "commissionPct", "rating",
      "workingDays", "startTime", "endTime", "status",
      "avatar", "signature", "password",
    ];
    const data: Record<string, unknown> = {};
    for (const key of validFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    // Never store or overwrite with plaintext — hash if a new password is sent
    if (typeof data.password === "string" && data.password) {
      data.password = await hashPassword(data.password);
    } else {
      delete data.password;
    }
    const doctor = await db.doctor.update({ where: { id }, data: data as never });
    return NextResponse.json(toSafe(doctor as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Error updating doctor:", error);
    const msg = error instanceof Error ? error.message : "Failed to update doctor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await db.doctor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting doctor:", error);
    return NextResponse.json({ error: "Failed to delete doctor" }, { status: 500 });
  }
});

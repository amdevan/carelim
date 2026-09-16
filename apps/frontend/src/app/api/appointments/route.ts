import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";
import { createWithRetry } from "@/lib/id-generator";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const doctorId = searchParams.get("doctorId");
    const status = searchParams.get("status");
    const branchId = searchParams.get("branchId");
    const where: Record<string, unknown> = {};
    if (date) {
      const d = new Date(date);
      const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      where.date = { gte: ds, lt: de };
    }
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    const appointments = await db.appointment.findMany({
      where,
      include: { patient: true, doctor: { include: { department: true } } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
});

export const POST = withTenant(async (req: NextRequest) => {
  const denied = await requirePermission(req, "Appointment", "create");
  if (denied) return denied;
  try {
    const body = await req.json();

    // Compute initial token number
    const d = new Date(body.date);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    let tokenNo = await db.appointment.count({
      where: { date: { gte: ds, lt: de }, doctorId: body.doctorId }
    }) + 1;

    // Use retry to handle race conditions on token number
    let appt;
    try {
      appt = await db.appointment.create({
        data: {
          branchId: body.branchId || null,
          patientId: body.patientId,
          doctorId: body.doctorId,
          departmentId: body.departmentId || undefined,
          date: new Date(body.date),
          time: body.time,
          type: body.type || "walk-in",
          reason: body.reason || undefined,
          referralName: body.referralName || undefined,
          priority: body.priority || undefined,
          fee: body.fee || 0,
          status: body.status || "scheduled",
          tokenNo,
        },
        include: { patient: true, doctor: true },
      });
    } catch (err: any) {
      if (err?.code === "P2002") {
        // Token number collision — retry with incremented value
        tokenNo = await db.appointment.count({
          where: { date: { gte: ds, lt: de }, doctorId: body.doctorId }
        }) + 1;
        appt = await db.appointment.create({
          data: {
            branchId: body.branchId || null,
            patientId: body.patientId,
            doctorId: body.doctorId,
            departmentId: body.departmentId || undefined,
            date: new Date(body.date),
            time: body.time,
            type: body.type || "walk-in",
            reason: body.reason || undefined,
            referralName: body.referralName || undefined,
            priority: body.priority || undefined,
            fee: body.fee || 0,
            status: body.status || "scheduled",
            tokenNo,
          },
          include: { patient: true, doctor: true },
        });
      } else {
        throw err;
      }
    }

    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Appointment", detail: `Booked appointment for ${appt.patient?.name}` } });
    return NextResponse.json(appt, { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
});

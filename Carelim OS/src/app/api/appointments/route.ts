import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const doctorId = searchParams.get("doctorId");
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (date) {
    const d = new Date(date);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    where.date = { gte: ds, lt: de };
  }
  if (doctorId) where.doctorId = doctorId;
  if (status) where.status = status;
  const appointments = await db.appointment.findMany({
    where,
    include: { patient: true, doctor: { include: { department: true } } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.appointment.count({
    where: { date: new Date(body.date), doctorId: body.doctorId }
  });
  const appt = await db.appointment.create({
    data: {
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
      tokenNo: count + 1,
    },
    include: { patient: true, doctor: true },
  });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "CREATE", module: "Appointment", detail: `Booked appointment for ${appt.patient?.name}` } });
  return NextResponse.json(appt, { status: 201 });
}

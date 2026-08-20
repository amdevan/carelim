import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingSource = searchParams.get("bookingSource");
  const where: Record<string, unknown> = {};
  if (bookingSource) where.bookingSource = bookingSource;
  const exts = await db.appointmentExtension.findMany({ where, orderBy: { createdAt: "desc" } });
  // Enrich with appointment + patient + doctor
  const apptIds = [...new Set(exts.map(e => e.appointmentId))];
  const appts = await db.appointment.findMany({ where: { id: { in: apptIds } }, include: { patient: true, doctor: true } });
  const aMap = Object.fromEntries(appts.map(a => [a.id, a]));
  return NextResponse.json(exts.map(e => ({
    ...e,
    appointment: aMap[e.appointmentId] ? {
      date: aMap[e.appointmentId].date,
      time: aMap[e.appointmentId].time,
      tokenNo: aMap[e.appointmentId].tokenNo,
      reason: aMap[e.appointmentId].reason,
      patientName: aMap[e.appointmentId].patient?.name || "—",
      patientCode: aMap[e.appointmentId].patient?.patientCode || "—",
      patientPhone: aMap[e.appointmentId].patient?.phone || "—",
      doctorName: aMap[e.appointmentId].doctor?.name || "—",
    } : null,
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ext = await db.appointmentExtension.create({ data: body });
  await db.patientActivityLog.create({ data: { patientId: body.patientId || "system", appointmentId: body.appointmentId, activity: "appointment_booked", description: `Appointment booked via ${body.bookingChannel} (${body.bookingSource})`, performedBy: "system" } });
  return NextResponse.json(ext, { status: 201 });
}

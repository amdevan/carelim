import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get patient's appointments
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const appointments = await db.appointment.findMany({
    where: { patientId: user.patientId },
    include: { doctor: { include: { department: true } }, department: true },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
  return NextResponse.json(appointments);
}

// POST - Book a new appointment
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, doctorId, date, time, type, reason, fee } = body;
  if (!userId || !doctorId || !date || !time) {
    return NextResponse.json({ error: "userId, doctorId, date and time are required" }, { status: 400 });
  }

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const count = await db.appointment.count({ where: { date: new Date(date), doctorId } });
  const appointment = await db.appointment.create({
    data: {
      patientId: user.patientId,
      doctorId,
      date: new Date(date),
      time,
      type: type || "online",
      reason: reason || null,
      fee: fee || doctor.consultationFee,
      status: "scheduled",
      tokenNo: count + 1,
    },
    include: { doctor: true },
  });

  // Create notification
  await db.patientNotification.create({
    data: {
      userId,
      title: "Appointment Booked",
      message: `Your appointment with ${doctor.name} is scheduled for ${date} at ${time}`,
      type: "reminder",
    },
  });

  return NextResponse.json(appointment, { status: 201 });
}

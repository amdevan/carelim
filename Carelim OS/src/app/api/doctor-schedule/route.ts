import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const where: Record<string, unknown> = {};
  if (doctorId) where.doctorId = doctorId;
  const slots = await db.doctorScheduleSlot.findMany({
    where,
    include: { doctor: { include: { department: true } } },
    orderBy: { createdAt: "asc" },
  });
  // Sort by day order Mon→Sun
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  slots.sort((a, b) => dayOrder.indexOf(a.dayName) - dayOrder.indexOf(b.dayName));
  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const slot = await db.doctorScheduleSlot.create({
    data: {
      doctorId: body.doctorId,
      dayName: body.dayName,
      startTime: body.startTime || "09:00",
      endTime: body.endTime || "17:00",
      slotDuration: body.slotDuration || 15,
      capacity: body.capacity || 20,
      bookedCount: 0,
      status: body.status || "available",
      notes: body.notes || null,
    },
  });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "CREATE", module: "Doctor", detail: `Added schedule for ${body.dayName}` } });
  return NextResponse.json(slot, { status: 201 });
}

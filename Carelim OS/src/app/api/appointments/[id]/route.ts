import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appt = await db.appointment.findUnique({ where: { id }, include: { patient: true, doctor: true } });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(appt);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const appt = await db.appointment.update({ where: { id }, data: body });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "UPDATE", module: "Appointment", detail: `Updated appointment status to ${body.status || ""}` } });
  return NextResponse.json(appt);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

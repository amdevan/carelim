import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      appointments: { include: { doctor: true }, orderBy: { date: "desc" }, take: 20 },
      prescriptions: { include: { doctor: true, items: true }, orderBy: { createdAt: "desc" }, take: 10 },
      invoices: { orderBy: { date: "desc" }, take: 10 },
      labTests: { orderBy: { orderedAt: "desc" }, take: 10 },
    },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patient);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patient = await db.patient.update({ where: { id }, data: body });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "UPDATE", module: "Patient", detail: `Updated patient ${patient.name}` } });
  return NextResponse.json(patient);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.patient.delete({ where: { id } });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "DELETE", module: "Patient", detail: "Deleted patient" } });
  return NextResponse.json({ ok: true });
}

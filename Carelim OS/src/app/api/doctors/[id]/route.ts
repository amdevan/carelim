import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await db.doctor.findUnique({
    where: { id },
    include: { department: true, appointments: { include: { patient: true }, orderBy: { date: "desc" }, take: 20 } },
  });
  if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doctor);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const doctor = await db.doctor.update({ where: { id }, data: body });
  return NextResponse.json(doctor);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.doctor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

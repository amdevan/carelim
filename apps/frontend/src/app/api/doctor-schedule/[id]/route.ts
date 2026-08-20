import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const slot = await db.doctorScheduleSlot.update({ where: { id }, data: body });
  return NextResponse.json(slot);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.doctorScheduleSlot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

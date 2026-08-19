import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.prescription.findUnique({
    where: { id },
    include: { patient: true, doctor: { include: { department: true } }, items: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(p);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.prescription.delete({ where: { id } });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "DELETE", module: "Prescription", detail: "Deleted prescription" } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const test = await db.labTestMaster.update({ where: { id }, data: body });
  return NextResponse.json(test);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.labTestMaster.delete({ where: { id } });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "DELETE", module: "LabTest", detail: "Deleted lab test" } });
  return NextResponse.json({ ok: true });
}

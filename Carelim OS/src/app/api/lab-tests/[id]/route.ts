import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "completed" || body.status === "approved") data.completedAt = new Date();
  const test = await db.labTest.update({ where: { id }, data });
  if (body.status === "approved") {
    await db.auditLog.create({ data: { user: "system@medcore.health", action: "APPROVE", module: "LabTest", detail: `Approved lab test ${test.testCode}` } });
  }
  return NextResponse.json(test);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.labTest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

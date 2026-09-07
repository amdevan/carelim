import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const task = await db.cRMTask.findUnique({
    where: { id },
    include: { contact: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
});

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };

  if (body.status === "completed") {
    data.completedAt = new Date();
  }

  const task = await db.cRMTask.update({ where: { id }, data });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated task: ${task.title}` },
  });
  return NextResponse.json(task);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.cRMTask.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted task ${id}` },
  });
  return NextResponse.json({ ok: true });
});

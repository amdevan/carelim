import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const template = await db.emailTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
});

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const template = await db.emailTemplate.update({ where: { id }, data: body });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated template: ${template.name}` },
  });
  return NextResponse.json(template);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.emailTemplate.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted template ${id}` },
  });
  return NextResponse.json({ ok: true });
});

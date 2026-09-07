import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const test = await db.labTestMaster.update({ where: { id }, data: body });
  return NextResponse.json(test);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.labTestMaster.delete({ where: { id } });
  await db.auditLog.create({ data: { user: getAuthEmail(_req), action: "DELETE", module: "LabTest", detail: "Deleted lab test" } });
  return NextResponse.json({ ok: true });
});

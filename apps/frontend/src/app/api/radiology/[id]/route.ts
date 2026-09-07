import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "approved" || body.status === "reported") data.completedAt = new Date();
  const test = await db.radiologyTest.update({ where: { id }, data });
  return NextResponse.json(test);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.radiologyTest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

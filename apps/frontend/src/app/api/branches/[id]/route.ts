import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const branch = await db.branch.update({ where: { id }, data: body });
  return NextResponse.json(branch);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.branch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const c = await db.careCoordinator.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
});
export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.nextFollowup) data.nextFollowup = new Date(body.nextFollowup);
  const c = await db.careCoordinator.update({ where: { id }, data });
  return NextResponse.json(c);
});
export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.careCoordinator.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const img = await db.dentalImage.findUnique({ where: { id } });
  if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(img);
});
export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.takenAt) data.takenAt = new Date(body.takenAt);
  if (body.annotation && typeof body.annotation === "object") data.annotation = JSON.stringify(body.annotation);
  const img = await db.dentalImage.update({ where: { id }, data });
  return NextResponse.json(img);
});
export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.dentalImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

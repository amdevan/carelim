import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const source = await db.patientSource.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(source);
});

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const source = await db.patientSource.update({ where: { id }, data: body });
  return NextResponse.json(source);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.patientSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

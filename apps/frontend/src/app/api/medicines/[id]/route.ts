import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const med = await db.medicine.findUnique({ where: { id }, include: { supplier: true } });
  if (!med) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(med);
});

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  if (body.expiryDate) body.expiryDate = new Date(body.expiryDate);
  const med = await db.medicine.update({ where: { id }, data: body });
  return NextResponse.json(med);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.medicine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  if (body.expiryDate) body.expiryDate = new Date(body.expiryDate);
  const inv = await db.labInventory.update({ where: { id }, data: body });
  return NextResponse.json(inv);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.labInventory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

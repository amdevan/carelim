import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

const UPDATABLE_FIELDS = ["name", "code", "clinicType", "address", "city", "state", "country", "zipCode", "phone", "email", "website", "timezone", "manager", "status"] as const;

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of UPDATABLE_FIELDS) {
    if (key in body) data[key] = body[key];
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  const branch = await db.branch.update({ where: { id }, data });
  return NextResponse.json(branch);
});

export const PATCH = PUT;
export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.branch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, hashPassword } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.joinDate) data.joinDate = new Date(body.joinDate);
  // Hash password if being updated
  if (body.password) {
    data.password = await hashPassword(body.password);
  } else {
    // Don't pass password field if not updating it
    delete data.password;
  }
  const staff = await db.staff.update({ where: { id }, data });
  // Don't return password in response
  const { password: _, ...staffWithoutPassword } = staff as any;
  return NextResponse.json(staffWithoutPassword);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.staff.delete({ where: { id } });
  await db.auditLog.create({ data: { user: getAuthEmail(_req), action: "DELETE", module: "Staff", detail: "Removed employee" } });
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data = { ...body };
  if (body.joinDate) data.joinDate = new Date(body.joinDate);
  const staff = await db.staff.update({ where: { id }, data });
  return NextResponse.json(staff);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.staff.delete({ where: { id } });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "DELETE", module: "Staff", detail: "Removed employee" } });
  return NextResponse.json({ ok: true });
}

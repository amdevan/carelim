import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "approved" || body.status === "reported") data.completedAt = new Date();
  const test = await db.radiologyTest.update({ where: { id }, data });
  return NextResponse.json(test);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.radiologyTest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

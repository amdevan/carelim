import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await db.dentalFollowup.findUnique({ where: { id } });
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(f);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.scheduledDate) data.scheduledDate = new Date(body.scheduledDate);
  if (body.completedDate) data.completedDate = new Date(body.completedDate);
  const f = await db.dentalFollowup.update({ where: { id }, data });
  return NextResponse.json(f);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.dentalFollowup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

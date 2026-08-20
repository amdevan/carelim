import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.implantCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.placementDate) data.placementDate = new Date(body.placementDate);
  if (body.abutmentDate) data.abutmentDate = new Date(body.abutmentDate);
  if (body.finalCrownDate) data.finalCrownDate = new Date(body.finalCrownDate);
  const c = await db.implantCase.update({ where: { id }, data });
  return NextResponse.json(c);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.implantCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const img = await db.dentalImage.findUnique({ where: { id } });
  if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(img);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.takenAt) data.takenAt = new Date(body.takenAt);
  if (body.annotation && typeof body.annotation === "object") data.annotation = JSON.stringify(body.annotation);
  const img = await db.dentalImage.update({ where: { id }, data });
  return NextResponse.json(img);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.dentalImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

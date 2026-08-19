import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.orthodonticCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  if (body.wireSequence && typeof body.wireSequence === "object") data.wireSequence = JSON.stringify(body.wireSequence);
  if (body.progressPhotos && typeof body.progressPhotos === "object") data.progressPhotos = JSON.stringify(body.progressPhotos);
  const c = await db.orthodonticCase.update({ where: { id }, data });
  return NextResponse.json(c);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.orthodonticCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

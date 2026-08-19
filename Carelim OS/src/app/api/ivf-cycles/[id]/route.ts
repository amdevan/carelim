import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cycle = await db.iVFCycle.findUnique({ where: { id }, include: { follicularRecords: { orderBy: { monitoringDate: "asc" } }, embryoRecords: true, transfers: true, pregnancy: true } });
  if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cycle);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.stimulationStart) data.stimulationStart = new Date(body.stimulationStart);
  if (body.opuDate) data.opuDate = new Date(body.opuDate);
  if (body.transferDate) data.transferDate = new Date(body.transferDate);
  const cycle = await db.iVFCycle.update({ where: { id }, data });
  return NextResponse.json(cycle);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.iVFCycle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

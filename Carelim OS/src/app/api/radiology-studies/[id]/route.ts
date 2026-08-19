import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "in-progress" && !body.performedAt) data.performedAt = new Date();
  if (body.status === "reported") data.reportedAt = new Date();
  if (body.status === "released") data.releasedAt = new Date();
  const study = await db.radiologyStudy.update({ where: { id }, data, include: { patient: true, modality: true, images: true, report: true } });
  return NextResponse.json(study);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.radiologyStudy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data = { ...body };
  if (body.purchaseDate) data.purchaseDate = new Date(body.purchaseDate);
  if (body.warrantyExpiry) data.warrantyExpiry = new Date(body.warrantyExpiry);
  if (body.lastCalibration) data.lastCalibration = new Date(body.lastCalibration);
  if (body.nextCalibration) data.nextCalibration = new Date(body.nextCalibration);
  const e = await db.labEquipment.update({ where: { id }, data });
  return NextResponse.json(e);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.labEquipment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

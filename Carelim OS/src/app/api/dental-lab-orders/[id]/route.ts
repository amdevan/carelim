import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.dentalLabOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.sentDate) data.sentDate = new Date(body.sentDate);
  if (body.deliveryDate) data.deliveryDate = new Date(body.deliveryDate);
  if (body.receivedDate) data.receivedDate = new Date(body.receivedDate);
  const order = await db.dentalLabOrder.update({ where: { id }, data });
  await db.auditLog.create({ data: { user: "system", action: "UPDATE", module: "Dental", detail: `Updated lab order ${order.orderNo} → ${body.status || ""}` } });
  return NextResponse.json(order);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.dentalLabOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

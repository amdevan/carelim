import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.labOrder.findUnique({
    where: { id },
    include: {
      patient: true,
      items: { include: { test: { include: { department: true, parameters: { include: { referenceRanges: true } } } } } },
      samples: { include: { tracking: true } },
      results: { include: { parameters: { include: { parameter: { include: { referenceRanges: true } } } } } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "collected" && !body.collectedAt) data.collectedAt = new Date();
  if (body.status === "completed" && !body.completedAt) data.completedAt = new Date();
  if (body.paidAmount !== undefined) {
    const order = await db.labOrder.findUnique({ where: { id } });
    if (order) data.paymentStatus = body.paidAmount >= order.netAmount ? "paid" : "partial";
  }
  const order = await db.labOrder.update({ where: { id }, data });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "UPDATE", module: "LabOrder", detail: `Updated lab order ${order.orderNo}` } });
  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.labOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

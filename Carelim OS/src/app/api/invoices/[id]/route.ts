import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await db.invoice.findUnique({ where: { id }, include: { patient: true, items: true } });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(inv);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const inv = await db.invoice.update({ where: { id }, data: body });
  if (body.paid !== undefined) {
    await db.auditLog.create({ data: { user: "system@medcore.health", action: "PAYMENT", module: "Billing", detail: `Payment for invoice ${inv.invoiceNo}` } });
  }
  return NextResponse.json(inv);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proc = await db.dentalProcedure.findUnique({ where: { id } });
  if (!proc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(proc);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.procedureDate) data.procedureDate = new Date(body.procedureDate);
  if (body.materialsUsed && typeof body.materialsUsed !== "string") data.materialsUsed = JSON.stringify(body.materialsUsed);
  if (body.medicineUsed && typeof body.medicineUsed !== "string") data.medicineUsed = JSON.stringify(body.medicineUsed);
  if (body.images && typeof body.images !== "string") data.images = JSON.stringify(body.images);
  const proc = await db.dentalProcedure.update({ where: { id }, data });
  return NextResponse.json(proc);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proc = await db.dentalProcedure.findUnique({ where: { id } });
  // Optionally null out the linked invoice instead of deleting it (keep financial trail)
  if (proc?.invoiceId) {
    await db.invoice.update({ where: { id: proc.invoiceId }, data: { status: "refunded" } }).catch(() => {});
  }
  await db.dentalProcedure.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

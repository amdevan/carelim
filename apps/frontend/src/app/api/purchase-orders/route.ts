import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const orders = await db.purchaseOrder.findMany({
    where,
    include: { supplier: true, items: { include: { medicine: true } }, grns: true },
    orderBy: { orderDate: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, supplierId, expectedDate, notes } = body;
  const count = await db.purchaseOrder.count();
  const meds = await db.medicine.findMany({ where: { id: { in: items.map((i: { medicineId: string }) => i.medicineId) } } });
  const subtotal = items.reduce((s: number, it: { medicineId: string; quantity: number; unitPrice: number; taxPct: number; discountPct: number }) => {
    const med = meds.find((m) => m.id === it.medicineId);
    const price = it.unitPrice || med?.purchasePrice || 0;
    const lineTotal = price * it.quantity;
    const afterDiscount = lineTotal * (1 - (it.discountPct || 0) / 100);
    const afterTax = afterDiscount * (1 + (it.taxPct || 0) / 100);
    return s + afterTax;
  }, 0);
  const taxAmount = Math.round(subtotal * 0.13);
  const po = await db.purchaseOrder.create({
    data: {
      poNumber: `PO-${String(count + 1).padStart(5, "0")}`,
      supplierId,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      status: "draft",
      subtotal,
      taxAmount,
      discountAmount: 0,
      totalAmount: subtotal + taxAmount,
      paidAmount: 0,
      notes,
      createdBy: "admin@medcore.health",
      items: {
        create: items.map((it: { medicineId: string; quantity: number; unitPrice: number; taxPct: number; discountPct: number }) => ({
          medicineId: it.medicineId,
          quantity: it.quantity,
          unitPrice: it.unitPrice || meds.find(m => m.id === it.medicineId)?.purchasePrice || 0,
          taxPct: it.taxPct || 13,
          discountPct: it.discountPct || 0,
          total: (it.unitPrice || meds.find(m => m.id === it.medicineId)?.purchasePrice || 0) * it.quantity,
        })),
      },
    },
    include: { items: true, supplier: true },
  });
  await db.auditLog.create({ data: { user: "admin@medcore.health", action: "CREATE", module: "PurchaseOrder", detail: `Created PO ${po.poNumber}` } });
  return NextResponse.json(po, { status: 201 });
}

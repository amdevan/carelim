import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
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
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { items, supplierId, expectedDate, notes } = body;
  const userEmail = getAuthEmail(req);
  const meds = await db.medicine.findMany({ where: { id: { in: items.map((i: { medicineId: string }) => i.medicineId) } } });

  // Compute per-item totals with discount and tax correctly
  const itemData = items.map((it: { medicineId: string; quantity: number; unitPrice: number; taxPct: number; discountPct: number }) => {
    const med = meds.find((m) => m.id === it.medicineId);
    const price = it.unitPrice || med?.purchasePrice || 0;
    const lineTotal = price * it.quantity;
    const discountAmt = lineTotal * ((it.discountPct || 0) / 100);
    const afterDiscount = lineTotal - discountAmt;
    const taxAmt = afterDiscount * ((it.taxPct || 0) / 100);
    const total = afterDiscount + taxAmt;
    return {
      medicineId: it.medicineId,
      quantity: it.quantity,
      unitPrice: price,
      taxPct: it.taxPct || 0,
      discountPct: it.discountPct || 0,
      total: Math.round(total),
    };
  });

  const subtotal = itemData.reduce((s, it) => s + it.total, 0);
  const totalDiscount = items.reduce((s: number, it: { unitPrice: number; quantity: number; discountPct: number }, i: number) => {
    const price = it.unitPrice || meds.find(m => m.id === items[i].medicineId)?.purchasePrice || 0;
    return s + price * it.quantity * ((it.discountPct || 0) / 100);
  }, 0);
  const totalTax = items.reduce((s: number, it: { unitPrice: number; quantity: number; taxPct: number; discountPct: number }, i: number) => {
    const price = it.unitPrice || meds.find(m => m.id === items[i].medicineId)?.purchasePrice || 0;
    const afterDiscount = price * it.quantity * (1 - (it.discountPct || 0) / 100);
    return s + afterDiscount * ((it.taxPct || 0) / 100);
  }, 0);

  const po = await db.purchaseOrder.create({
    data: {
      poNumber: `PO-${nanoid(8).toUpperCase()}`,
      supplierId,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      status: "draft",
      subtotal: Math.round(subtotal - totalTax),
      taxAmount: Math.round(totalTax),
      discountAmount: Math.round(totalDiscount),
      totalAmount: Math.round(subtotal),
      paidAmount: 0,
      notes,
      createdBy: userEmail,
      items: { create: itemData },
    },
    include: { items: true, supplier: true },
  });
  await db.auditLog.create({ data: { user: userEmail, action: "CREATE", module: "PurchaseOrder", detail: `Created PO ${po.poNumber}` } });
  return NextResponse.json(po, { status: 201 });
});

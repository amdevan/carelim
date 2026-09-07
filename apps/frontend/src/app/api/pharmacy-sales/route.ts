import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  const sales = await db.pharmacySale.findMany({
    where,
    include: { items: { include: { medicine: true } } },
    orderBy: { saleDate: "desc" },
  });
  return NextResponse.json(sales);
});

export const POST = withTenant(async (req: NextRequest) => {
  const denied = await requirePermission(req, "Pharmacy", "create");
  if (denied) return denied;
  const body = await req.json();
  const { items, patientName, doctorName, prescriptionRef, discount, tax, paymentMethod, branchId, paidAmount } = body;
  const userEmail = getAuthEmail(req);

  // Compute subtotal with per-item discounts
  const subtotal = items.reduce((s: number, it: { unitPrice: number; quantity: number; discount?: number }) =>
    s + it.unitPrice * it.quantity - (Number(it.discount) || 0), 0);
  const total = Math.max(0, subtotal - (discount || 0) + (tax || 0));
  const finalPaidAmount = paidAmount !== undefined ? Number(paidAmount) : total;
  const paymentStatus = finalPaidAmount >= total ? "paid" : finalPaidAmount > 0 ? "partial" : "unpaid";

  // Use transaction to ensure stock and sale are consistent
  const sale = await db.$transaction(async (tx) => {
    // Generate sequential invoice number: PH-00001, PH-00002, ...
    const count = await tx.pharmacySale.count();
    const invoiceNo = `PH-${String(count + 1).padStart(5, "0")}`;

    const saleRecord = await tx.pharmacySale.create({
      data: {
        invoiceNo,
        branchId: branchId || null,
        patientName,
        doctorName,
        prescriptionRef,
        subtotal,
        discount: discount || 0,
        tax: tax || 0,
        total,
        paidAmount: finalPaidAmount,
        paymentMethod: paymentMethod || "Cash",
        paymentStatus,
        status: "completed",
        items: {
          create: items.map((it: { medicineId: string; quantity: number; unitPrice: number; discount?: number }) => ({
            medicineId: it.medicineId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: Number(it.discount) || 0,
            total: it.unitPrice * it.quantity - (Number(it.discount) || 0),
          })),
        },
      },
      include: { items: true },
    });

    // Reduce stock atomically
    for (const item of saleRecord.items) {
      const med = await tx.medicine.findUnique({ where: { id: item.medicineId } });
      if (med) {
        const newQty = Math.max(0, med.stockQty - item.quantity);
        await tx.medicine.update({ where: { id: item.medicineId }, data: { stockQty: newQty } });
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            type: "sale",
            quantity: -item.quantity,
            balanceAfter: newQty,
            reference: saleRecord.invoiceNo,
            performedBy: userEmail,
          },
        });
      }
    }

    await tx.auditLog.create({ data: { user: userEmail, action: "CREATE", module: "PharmacySale", detail: `Sale ${saleRecord.invoiceNo}` } });
    return saleRecord;
  });

  return NextResponse.json(sale, { status: 201 });
});

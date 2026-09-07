import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const PATCH = withTenant(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const userEmail = getAuthEmail(req);

  const existing = await db.pharmacySale.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const paidAmount = body.paidAmount !== undefined ? Number(body.paidAmount) : existing.paidAmount;
  const paymentStatus = paidAmount >= existing.total ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

  const sale = await db.pharmacySale.update({
    where: { id },
    data: {
      patientName: body.patientName ?? existing.patientName,
      doctorName: body.doctorName !== undefined ? body.doctorName : existing.doctorName,
      paymentMethod: body.paymentMethod ?? existing.paymentMethod,
      paidAmount,
      paymentStatus,
    },
  });

  await db.auditLog.create({ data: { user: userEmail, action: "UPDATE", module: "PharmacySale", detail: `Sale ${existing.invoiceNo}` } });
  return NextResponse.json(sale);
});

export const DELETE = withTenant(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const userEmail = getAuthEmail(req);

  const existing = await db.pharmacySale.findUnique({ where: { id }, include: { items: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.$transaction(async (tx) => {
    // Restore stock for each item
    for (const item of existing.items) {
      const med = await tx.medicine.findUnique({ where: { id: item.medicineId } });
      if (med) {
        const newQty = med.stockQty + item.quantity;
        await tx.medicine.update({ where: { id: item.medicineId }, data: { stockQty: newQty } });
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            type: "adjustment",
            quantity: item.quantity,
            balanceAfter: newQty,
            reference: existing.invoiceNo,
            performedBy: userEmail,
          },
        });
      }
    }
    await tx.pharmacySaleItem.deleteMany({ where: { saleId: id } });
    await tx.pharmacySale.delete({ where: { id } });
    await tx.auditLog.create({ data: { user: userEmail, action: "DELETE", module: "PharmacySale", detail: `Sale ${existing.invoiceNo}` } });
  });

  return NextResponse.json({ success: true });
});

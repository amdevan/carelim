import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const sales = await db.pharmacySale.findMany({
    include: { items: { include: { medicine: true } } },
    orderBy: { saleDate: "desc" },
    take: 100,
  });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, patientName, doctorName, prescriptionRef, discount, tax, paymentMethod } = body;
  const count = await db.pharmacySale.count();
  const subtotal = items.reduce((s: number, it: { unitPrice: number; quantity: number }) => s + it.unitPrice * it.quantity, 0);
  const total = subtotal + (tax || 0) - (discount || 0);
  const sale = await db.pharmacySale.create({
    data: {
      invoiceNo: `PHARM-${String(count + 1).padStart(5, "0")}`,
      patientName,
      doctorName,
      prescriptionRef,
      subtotal,
      discount: discount || 0,
      tax: tax || 0,
      total,
      paidAmount: total,
      paymentMethod: paymentMethod || "Cash",
      paymentStatus: "paid",
      status: "completed",
      items: {
        create: items.map((it: { medicineId: string; quantity: number; unitPrice: number }) => ({
          medicineId: it.medicineId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: 0,
          total: it.unitPrice * it.quantity,
        })),
      },
    },
    include: { items: true },
  });
  // Reduce stock and create stock movements
  for (const item of sale.items) {
    const med = await db.medicine.findUnique({ where: { id: item.medicineId } });
    if (med) {
      await db.medicine.update({ where: { id: item.medicineId }, data: { stockQty: Math.max(0, med.stockQty - item.quantity) } });
      await db.stockMovement.create({
        data: {
          medicineId: item.medicineId,
          type: "sale",
          quantity: -item.quantity,
          balanceAfter: Math.max(0, med.stockQty - item.quantity),
          reference: sale.invoiceNo,
          performedBy: "Pharmacist",
        },
      });
    }
  }
  await db.auditLog.create({ data: { user: "Pharmacist", action: "CREATE", module: "PharmacySale", detail: `Sale ${sale.invoiceNo}` } });
  return NextResponse.json(sale, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "received") data.receivedDate = new Date();
  if (body.paidAmount !== undefined) {
    const po = await db.purchaseOrder.findUnique({ where: { id } });
    if (po) data.status = body.paidAmount >= po.totalAmount ? "received" : po.status;
  }
  const po = await db.purchaseOrder.update({ where: { id }, data });
  // If received, update stock and create stock movements
  if (body.status === "received") {
    const fullPO = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (fullPO) {
      for (const item of fullPO.items) {
        const med = await db.medicine.findUnique({ where: { id: item.medicineId } });
        if (med) {
          await db.medicine.update({ where: { id: item.medicineId }, data: { stockQty: med.stockQty + item.quantity } });
          await db.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              type: "purchase",
              quantity: item.quantity,
              balanceAfter: med.stockQty + item.quantity,
              reference: fullPO.poNumber,
              performedBy: "Store Manager",
            },
          });
        }
      }
    }
  }
  return NextResponse.json(po);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const userEmail = getAuthEmail(req);
  const data: Record<string, unknown> = { ...body };
  if (body.status === "received") data.receivedDate = new Date();
  if (body.paidAmount !== undefined) {
    const po = await db.purchaseOrder.findUnique({ where: { id } });
    if (po) data.status = body.paidAmount >= po.totalAmount ? "received" : po.status;
  }
  const po = await db.purchaseOrder.update({ where: { id }, data });
  // If received, update stock for items not yet received (handle partial receipts)
  if (body.status === "received") {
    const fullPO = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (fullPO) {
      for (const item of fullPO.items) {
        const remainingQty = item.quantity - (item.receivedQty || 0);
        if (remainingQty <= 0) continue;
        const med = await db.medicine.findUnique({ where: { id: item.medicineId } });
        if (med) {
          const newQty = med.stockQty + remainingQty;
          await db.medicine.update({ where: { id: item.medicineId }, data: { stockQty: newQty } });
          await db.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              type: "purchase",
              quantity: remainingQty,
              balanceAfter: newQty,
              reference: fullPO.poNumber,
              performedBy: userEmail,
            },
          });
        }
      }
    }
  }
  return NextResponse.json(po);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

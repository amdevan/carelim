import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "approved") data.approvedAt = new Date();
  if (body.status === "received") { data.receivedAt = new Date(); data.approvedAt = data.approvedAt || new Date(); }
  const transfer = await db.stockTransfer.update({ where: { id }, data });
  
  // If received, update stock levels
  if (body.status === "received") {
    const fullTransfer = await db.stockTransfer.findUnique({ where: { id }, include: { items: true } });
    if (fullTransfer) {
      for (const item of fullTransfer.items) {
        // Reduce from source
        const fromStock = await db.inventoryStock.findFirst({ where: { itemId: item.itemId, locationId: fullTransfer.fromLocationId } });
        if (fromStock) {
          await db.inventoryStock.update({ where: { id: fromStock.id }, data: { quantity: Math.max(0, fromStock.quantity - item.quantity) } });
        }
        // Add to destination
        const toStock = await db.inventoryStock.findFirst({ where: { itemId: item.itemId, locationId: fullTransfer.toLocationId } });
        if (toStock) {
          await db.inventoryStock.update({ where: { id: toStock.id }, data: { quantity: toStock.quantity + item.quantity } });
        } else {
          await db.inventoryStock.create({ data: { itemId: item.itemId, locationId: fullTransfer.toLocationId, quantity: item.quantity } });
        }
        // Create movement
        await db.inventoryMovement.create({ data: { itemId: item.itemId, locationId: fullTransfer.toLocationId, type: "transfer", direction: "in", quantity: item.quantity, balanceAfter: 0, reference: fullTransfer.transferNo, performedBy: "System" } });
      }
    }
  }
  return NextResponse.json(transfer);
}

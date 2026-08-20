import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const transfers = await db.stockTransfer.findMany({
    include: { fromLocation: true, toLocation: true, items: { include: { item: true } } },
    orderBy: { transferDate: "desc" },
  });
  return NextResponse.json(transfers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, fromLocationId, toLocationId, notes, requestedBy } = body;
  const count = await db.stockTransfer.count();
  const transfer = await db.stockTransfer.create({
    data: {
      transferNo: `STR-${String(count + 1).padStart(5, "0")}`,
      fromLocationId,
      toLocationId,
      status: "pending",
      notes,
      requestedBy,
      items: {
        create: items.map((it: { itemId: string; quantity: number }) => ({
          itemId: it.itemId,
          quantity: it.quantity,
        })),
      },
    },
    include: { items: true },
  });
  await db.auditLog.create({ data: { user: requestedBy || "system", action: "CREATE", module: "StockTransfer", detail: `Created transfer ${transfer.transferNo}` } });
  return NextResponse.json(transfer, { status: 201 });
}

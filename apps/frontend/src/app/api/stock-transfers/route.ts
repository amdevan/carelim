import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async () => {
  const transfers = await db.stockTransfer.findMany({
    include: { fromLocation: true, toLocation: true, items: { include: { item: true } } },
    orderBy: { transferDate: "desc" },
  });
  return NextResponse.json(transfers);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { items, fromLocationId, toLocationId, notes, requestedBy } = body;
  const count = await db.stockTransfer.count();
  const transfer = await db.stockTransfer.create({
    data: {
      transferNo: `STR-${nanoid(8).toUpperCase()}`,
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
});

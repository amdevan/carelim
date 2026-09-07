import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const items = await db.inventoryItem.findMany({
    include: { stocks: { include: { location: true } }, batches: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const item = await db.inventoryItem.create({ data: body });
  await db.auditLog.create({ data: { user: "admin@medcore.health", action: "CREATE", module: "Inventory", detail: `Created item ${item.name}` } });
  return NextResponse.json(item, { status: 201 });
});

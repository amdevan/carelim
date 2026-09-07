import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  const where: Record<string, unknown> = {};
  if (itemId) where.itemId = itemId;
  const movements = await db.inventoryMovement.findMany({
    where,
    include: { item: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(movements);
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const locations = await db.inventoryLocation.findMany({
    include: { _count: { select: { stocks: true, transfersFrom: true, transfersTo: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(locations);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  if (!body.code) {
    const count = await db.inventoryLocation.count();
    body.code = `LOC-${String(count + 1).padStart(3, "0")}`;
  }
  const loc = await db.inventoryLocation.create({ data: body });
  return NextResponse.json(loc, { status: 201 });
});

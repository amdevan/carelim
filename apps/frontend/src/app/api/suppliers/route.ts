import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const suppliers = await db.supplier.findMany({ include: { _count: { select: { medicines: true, purchaseOrders: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(suppliers);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const supplier = await db.supplier.create({ data: body });
  return NextResponse.json(supplier, { status: 201 });
});

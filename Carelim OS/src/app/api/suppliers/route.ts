import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const suppliers = await db.supplier.findMany({ include: { _count: { select: { medicines: true, purchaseOrders: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supplier = await db.supplier.create({ data: body });
  return NextResponse.json(supplier, { status: 201 });
}

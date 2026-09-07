import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";
export const GET = withTenant(async () => {
  const payments = await db.supplierPayment.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(payments);
});
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.supplierPayment.count();
  const payment = await db.supplierPayment.create({
    data: { ...body, paymentNo: `SP-${nanoid(8).toUpperCase()}` },
  });
  return NextResponse.json(payment, { status: 201 });
});

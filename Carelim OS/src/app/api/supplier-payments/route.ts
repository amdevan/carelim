import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const payments = await db.supplierPayment.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(payments);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.supplierPayment.count();
  const payment = await db.supplierPayment.create({
    data: { ...body, paymentNo: `SP-${String(count + 1).padStart(5, "0")}` },
  });
  return NextResponse.json(payment, { status: 201 });
}

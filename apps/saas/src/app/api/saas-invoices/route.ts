import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const invoices = await db.saaSInvoice.findMany({
      include: { tenant: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

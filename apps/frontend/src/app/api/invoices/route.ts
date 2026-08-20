import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const invoices = await db.invoice.findMany({
      where,
      include: { patient: true, items: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const count = await db.invoice.count();
    const { items, ...data } = body;
    const invoice = await db.invoice.create({
      data: {
        ...data,
        date: new Date(),
        invoiceNo: `INV-${String(count + 1).padStart(5, "0")}`,
        items: { create: items || [] },
      },
      include: { items: true, patient: true },
    });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Invoice", detail: `Created invoice ${invoice.invoiceNo}` } });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

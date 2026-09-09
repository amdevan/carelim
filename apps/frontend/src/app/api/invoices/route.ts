import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const branchId = searchParams.get("branchId");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
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
});

export const POST = withTenant(async (req: NextRequest) => {
  const denied = await requirePermission(req, "Billing", "create");
  if (denied) return denied;
  try {
    const body = await req.json();
    const count = await db.invoice.count();
    const nextNum = (count + 1).toString().padStart(5, "0");
    const { items, ...data } = body;
    const invoice = await db.invoice.create({
      data: {
        ...data,
        date: new Date(),
        invoiceNo: `INV-${nextNum}`,
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
});

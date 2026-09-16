import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const inv = await db.invoice.findUnique({ where: { id }, include: { patient: true, items: true } });
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(inv);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
});

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();

    // Recalculate due from total and paid
    const current = await db.invoice.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newPaid = body.paid !== undefined ? body.paid : current.paid;
    const newTotal = body.total !== undefined ? body.total : current.total;
    const due = Math.max(0, newTotal - newPaid);

    // Auto-update status based on due
    let status = body.status || current.status;
    if (body.paid !== undefined) {
      status = due <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
    }

    // Whitelist allowed fields
    const data: Record<string, unknown> = { due, status };
    if (body.paid !== undefined) data.paid = body.paid;
    if (body.total !== undefined) data.total = body.total;
    if (body.discount !== undefined) data.discount = body.discount;
    if (body.tax !== undefined) data.tax = body.tax;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;

    const inv = await db.invoice.update({ where: { id }, data });
    if (body.paid !== undefined) {
      await db.auditLog.create({ data: { user: getAuthEmail(req), action: "PAYMENT", module: "Billing", detail: `Payment for invoice ${inv.invoiceNo}` } });
    }
    return NextResponse.json(inv);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
});

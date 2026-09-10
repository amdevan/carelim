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
    // Get the highest existing invoice number to avoid duplicates
    const latest = await db.invoice.findMany({
      where: { invoiceNo: { startsWith: "INV-" } },
      orderBy: { invoiceNo: "desc" },
      take: 1,
      select: { invoiceNo: true },
    });
    let nextNum = 1;
    if (latest.length > 0) {
      const match = latest[0].invoiceNo.match(/INV-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const { items, testIds, ...data } = body;
    const invoice = await db.invoice.create({
      data: {
        ...data,
        date: new Date(),
        invoiceNo: `INV-${nextNum.toString().padStart(5, "0")}`,
        items: { create: items || [] },
      },
      include: { items: true, patient: true },
    });

    // Create lab order if lab test IDs provided
    if (data.type === "lab" && testIds && testIds.length > 0) {
      try {
        const tests = await db.labTestMaster.findMany({ where: { id: { in: testIds } } });
        if (tests.length > 0) {
          // Get the highest existing lab order number to avoid duplicates
          const latestLab = await db.labOrder.findMany({
            where: { orderNo: { startsWith: "LAB-" } },
            orderBy: { orderNo: "desc" },
            take: 1,
            select: { orderNo: true },
          });
          let labNextNum = 1;
          if (latestLab.length > 0) {
            const m = latestLab[0].orderNo.match(/LAB-(\d+)/);
            if (m) labNextNum = parseInt(m[1], 10) + 1;
          }
          const labOrderNo = `LAB-${String(labNextNum).padStart(5, "0")}`;
          const totalAmount = tests.reduce((s, t) => s + t.price, 0);
          const disc = data.discount || 0;
          const tax = Math.round((totalAmount - disc) * 0.13);
          const netAmount = totalAmount - disc + tax;

          await db.labOrder.create({
            data: {
              orderNo: labOrderNo,
              patientId: data.patientId,
              doctorId: data.doctorId || null,
              priority: "normal",
              status: "ordered",
              totalAmount,
              discount: disc,
              tax,
              netAmount,
              paidAmount: data.paid || 0,
              paymentStatus: data.paid >= netAmount ? "paid" : data.paid > 0 ? "partial" : "unpaid",
              invoiceId: invoice.id,
              barcode: labOrderNo,
              items: {
                create: tests.map(t => ({ testId: t.id, price: t.price, status: "ordered", resultStatus: "pending" })),
              },
            },
          });
        }
      } catch (labErr) {
        console.error("Failed to create lab order:", labErr);
        // Invoice still created, lab order creation failed
      }
    }

    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Invoice", detail: `Created invoice ${invoice.invoiceNo}` } });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
});

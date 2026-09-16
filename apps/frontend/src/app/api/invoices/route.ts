import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";
import { getNextSequenceNumber, createWithRetry } from "@/lib/id-generator";

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
    const { items, testIds, ...data } = body;

    let invoiceNo = await getNextSequenceNumber("INV-", () =>
      db.invoice.findMany({
        where: { invoiceNo: { startsWith: "INV-" } },
        orderBy: { invoiceNo: "desc" },
        take: 1,
        select: { invoiceNo: true },
      }).then(rows => rows.map(r => ({ code: r.invoiceNo })))
    );
    const invoice = await createWithRetry(
      async () => {
        return db.invoice.create({
          data: {
            ...data,
            date: new Date(),
            invoiceNo,
            items: { create: items || [] },
          },
          include: { items: true, patient: true },
        });
      },
      async () => {
        invoiceNo = await getNextSequenceNumber("INV-", () =>
          db.invoice.findMany({
            where: { invoiceNo: { startsWith: "INV-" } },
            orderBy: { invoiceNo: "desc" },
            take: 1,
            select: { invoiceNo: true },
          }).then(rows => rows.map(r => ({ code: r.invoiceNo })))
        );
      },
    );

    // Create lab order if lab test IDs provided
    if (data.type === "lab" && testIds && testIds.length > 0) {
      try {
        const tests = await db.labTestMaster.findMany({ where: { id: { in: testIds } } });
        if (tests.length > 0) {
          let labOrderNo = await getNextSequenceNumber("LAB-", () =>
            db.labOrder.findMany({
              where: { orderNo: { startsWith: "LAB-" } },
              orderBy: { orderNo: "desc" },
              take: 1,
              select: { orderNo: true },
            }).then(rows => rows.map(r => ({ code: r.orderNo })))
          );
          const totalAmount = tests.reduce((s, t) => s + t.price, 0);
          const disc = data.discount || 0;
          const tax = Math.round((totalAmount - disc) * 0.13);
          const netAmount = totalAmount - disc + tax;

          await createWithRetry(
            () => db.labOrder.create({
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
            }),
            async () => {
              labOrderNo = await getNextSequenceNumber("LAB-", () =>
                db.labOrder.findMany({
                  where: { orderNo: { startsWith: "LAB-" } },
                  orderBy: { orderNo: "desc" },
                  take: 1,
                  select: { orderNo: true },
                }).then(rows => rows.map(r => ({ code: r.orderNo })))
              );
            },
          );
        }
      } catch (labErr) {
        console.error("Failed to create lab order:", labErr);
      }
    }

    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Invoice", detail: `Created invoice ${invoice.invoiceNo}` } });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
});

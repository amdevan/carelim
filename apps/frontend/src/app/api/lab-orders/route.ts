import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { getNextSequenceNumber, createWithRetry } from "@/lib/id-generator";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const patientId = searchParams.get("patientId");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (patientId) where.patientId = patientId;
    const orders = await db.labOrder.findMany({
      where,
      include: {
        patient: true,
        items: { include: { test: { include: { department: true } } } },
        samples: { include: { tracking: true } },
        results: { include: { parameters: { include: { parameter: { include: { referenceRanges: true } } } } } },
      },
      orderBy: { orderedAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching lab orders:", error);
    return NextResponse.json({ error: "Failed to fetch lab orders" }, { status: 500 });
  }
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { testIds, patientId, doctorId, priority, clinicalNotes, discount } = body;

    let orderNo = await getNextSequenceNumber("LAB-", () =>
      db.labOrder.findMany({
        where: { orderNo: { startsWith: "LAB-" } },
        orderBy: { orderNo: "desc" },
        take: 1,
        select: { orderNo: true },
      }).then(rows => rows.map(r => ({ code: r.orderNo })))
    );

    const tests = await db.labTestMaster.findMany({ where: { id: { in: testIds } } });
    const totalAmount = tests.reduce((s, t) => s + t.price, 0);
    const disc = discount || 0;
    const tax = Math.round((totalAmount - disc) * 0.13);
    const netAmount = totalAmount - disc + tax;

    const order = await createWithRetry(
      () => db.labOrder.create({
        data: {
          orderNo,
          patientId,
          doctorId: doctorId || null,
          priority: priority || "normal",
          clinicalNotes: clinicalNotes || null,
          status: "ordered",
          totalAmount,
          discount: disc,
          tax,
          netAmount,
          paidAmount: 0,
          paymentStatus: "unpaid",
          barcode: orderNo,
          items: {
            create: tests.map(t => ({ testId: t.id, price: t.price, status: "ordered", resultStatus: "pending" })),
          },
        },
        include: { items: { include: { test: true } }, patient: true },
      }),
      async () => {
        orderNo = await getNextSequenceNumber("LAB-", () =>
          db.labOrder.findMany({
            where: { orderNo: { startsWith: "LAB-" } },
            orderBy: { orderNo: "desc" },
            take: 1,
            select: { orderNo: true },
          }).then(rows => rows.map(r => ({ code: r.orderNo })))
        );
      },
    );

    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "LabOrder", detail: `Created lab order ${order.orderNo}` } });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating lab order:", error);
    return NextResponse.json({ error: "Failed to create lab order" }, { status: 500 });
  }
});

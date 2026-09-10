import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
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
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { testIds, patientId, doctorId, priority, clinicalNotes, discount } = body;
  // Get the highest existing lab order number to avoid duplicates
  const latest = await db.labOrder.findMany({
    where: { orderNo: { startsWith: "LAB-" } },
    orderBy: { orderNo: "desc" },
    take: 1,
    select: { orderNo: true },
  });
  let nextNum = 1;
  if (latest.length > 0) {
    const match = latest[0].orderNo.match(/LAB-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const orderNo = `LAB-${String(nextNum).padStart(5, "0")}`;
  const tests = await db.labTestMaster.findMany({ where: { id: { in: testIds } } });
  const totalAmount = tests.reduce((s, t) => s + t.price, 0);
  const disc = discount || 0;
  const tax = Math.round((totalAmount - disc) * 0.13);
  const netAmount = totalAmount - disc + tax;

  const order = await db.labOrder.create({
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
  });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "LabOrder", detail: `Created lab order ${order.orderNo}` } });
  return NextResponse.json(order, { status: 201 });
});

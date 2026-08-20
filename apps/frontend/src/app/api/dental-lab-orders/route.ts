import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  const orders = await db.dentalLabOrder.findMany({ where, orderBy: { sentDate: "desc" } });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.dentalLabOrder.count();
  const order = await db.dentalLabOrder.create({
    data: {
      ...body,
      orderNo: `DLO-${String(count + 1).padStart(5, "0")}`,
      sentDate: body.sentDate ? new Date(body.sentDate) : new Date(),
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      receivedDate: body.receivedDate ? new Date(body.receivedDate) : null,
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created lab order ${order.orderNo} (${order.labType})` } });
  return NextResponse.json(order, { status: 201 });
}

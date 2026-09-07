import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;
  const samples = await db.labSample.findMany({
    where,
    include: { order: { include: { patient: true } }, tracking: { orderBy: { timestamp: "desc" } } },
    orderBy: { collectionTime: "desc" },
  });
  return NextResponse.json(samples);
});

// Collect sample
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { orderId, testId, sampleType, containerType, collectorName, location } = body;
  const count = await db.labSample.count();
  const now = new Date();
  const sample = await db.labSample.create({
    data: {
      sampleCode: `S-${nanoid(8).toUpperCase()}`,
      orderId,
      testId: testId || null,
      sampleType: sampleType || "Blood",
      containerType: containerType || "EDTA Tube",
      barcode: `SMP${String(count + 1).padStart(6, "0")}`,
      qrCode: `QR-${orderId}-${testId || "all"}`,
      collectorName: collectorName || null,
      collectionTime: now,
      collectedAt: now.toISOString(),
      receivedAt: now,
      status: "collected",
      location: location || "Sample Reception",
      tracking: {
        create: [
          { status: "collected", location: location || "Sample Reception", handler: collectorName || "Collector", timestamp: now },
        ],
      },
    },
    include: { tracking: true },
  });
  // Update order status to collected
  await db.labOrder.update({ where: { id: orderId }, data: { status: "collected", collectedAt: now } });
  await db.labOrderItem.updateMany({ where: { orderId, testId: testId || undefined }, data: { status: "collected" } });
  await db.auditLog.create({ data: { user: collectorName || "system", action: "CREATE", module: "LabSample", detail: `Collected sample ${sample.sampleCode}` } });
  return NextResponse.json(sample, { status: 201 });
});

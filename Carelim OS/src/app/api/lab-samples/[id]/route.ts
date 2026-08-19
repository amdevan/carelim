import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Update sample status (reject, recollect, send to department, complete)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status, location, handler, notes, rejectionReason } = body;
  const data: Record<string, unknown> = { status };
  if (rejectionReason) data.rejectionReason = rejectionReason;
  if (location) data.location = location;
  if (status === "received") data.receivedAt = new Date();
  const sample = await db.labSample.update({ where: { id }, data });
  // Add tracking entry
  await db.labSampleTracking.create({
    data: { sampleId: id, status, location: location || sample.location || null, handler: handler || null, notes: notes || null, timestamp: new Date() },
  });
  await db.auditLog.create({ data: { user: handler || "system", action: "UPDATE", module: "LabSample", detail: `Sample ${sample.sampleCode} → ${status}` } });
  return NextResponse.json(sample);
}

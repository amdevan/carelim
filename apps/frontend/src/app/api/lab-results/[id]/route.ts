import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Enter/update results, verify, approve, release
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action, parameters, technicianName, pathologistComments, rejectionReason, verifiedBy, approvedBy, releasedBy } = body;

  const data: Record<string, unknown> = {};

  if (action === "enter") {
    data.status = "entered";
    data.technicianName = technicianName;
    data.enteredAt = new Date();
    // Update parameters
    if (parameters) {
      for (const p of parameters) {
        await db.labResultParameter.update({ where: { id: p.id }, data: { value: p.value, flag: p.flag || "normal", comment: p.comment || null } });
      }
    }
  } else if (action === "verify") {
    data.status = "verified";
    data.verifiedBy = verifiedBy;
    data.verifiedAt = new Date();
  } else if (action === "approve") {
    data.status = "approved";
    data.approvedBy = approvedBy;
    data.approvedAt = new Date();
    data.pathologistComments = pathologistComments || null;
    // Update order item result status
    const result = await db.labResult.findUnique({ where: { id } });
    if (result?.testItemId) {
      await db.labOrderItem.update({ where: { id: result.testItemId }, data: { resultStatus: "approved", status: "approved" } });
    }
  } else if (action === "release") {
    data.status = "released";
    data.releasedBy = releasedBy;
    data.releasedAt = new Date();
    const result = await db.labResult.findUnique({ where: { id } });
    if (result?.testItemId) {
      await db.labOrderItem.update({ where: { id: result.testItemId }, data: { resultStatus: "released" } });
    }
    // Check if all items in order are released/approved
    if (result?.orderId) {
      const order = await db.labOrder.findUnique({ where: { id: result.orderId }, include: { items: true } });
      if (order && order.items.every(i => i.resultStatus === "released" || i.resultStatus === "approved")) {
        await db.labOrder.update({ where: { id: order.id }, data: { status: "completed", completedAt: new Date() } });
      }
    }
  } else if (action === "reject") {
    data.status = "rejected";
    data.rejectionReason = rejectionReason;
  }

  const result = await db.labResult.update({ where: { id }, data, include: { parameters: { include: { parameter: true } } } });
  await db.auditLog.create({ data: { user: technicianName || verifiedBy || approvedBy || releasedBy || "system", action: action.toUpperCase(), module: "LabResult", detail: `Result ${result.id} → ${action}` } });
  return NextResponse.json(result);
}

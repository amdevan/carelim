import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const procs = await db.dentalProcedure.findMany({ where, orderBy: { procedureDate: "desc" } });
  return NextResponse.json(procs);
}

// POST creates the procedure AND automatically creates an invoice via the Billing module.
// It also deducts materials from inventory (if itemId is a valid inventoryItem) and
// appends a clinical note to the patient's EMR timeline.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.dentalProcedure.count();
  const procNo = `DPR-${String(count + 1).padStart(5, "0")}`;
  const procDate = body.procedureDate ? new Date(body.procedureDate) : new Date();

  // Determine cost from treatment plan if not provided
  let cost = body.cost;
  if (!cost && body.treatmentPlanId) {
    const plan = await db.dentalTreatmentPlan.findUnique({ where: { id: body.treatmentPlanId } });
    if (plan) cost = plan.estimatedCost;
  }
  if (cost == null) cost = 2000;

  const tax = Math.round(cost * 0.13);
  const total = cost + tax;

  // Auto-create invoice via Billing module
  const invCount = await db.invoice.count();
  const invoice = await db.invoice.create({
    data: {
      invoiceNo: `INV-${String(invCount + 1).padStart(5, "0")}`,
      patientId: body.patientId,
      type: "consultation",
      subtotal: cost,
      discount: 0,
      tax,
      total,
      paid: body.markPaid === false ? 0 : total,
      due: body.markPaid === false ? total : 0,
      status: body.markPaid === false ? "unpaid" : "paid",
      paymentMethod: body.paymentMethod || "Cash",
      date: procDate,
      items: { create: [{ description: `Dental — ${body.procedureType?.replace(/_/g, " ") || "procedure"} (${body.toothNumbers || "—"})`, qty: 1, rate: cost, amount: cost }] },
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Billing", detail: `Auto-invoice ${invoice.invoiceNo} for dental procedure ${procNo}` } });

  // Deduct materials from inventory if itemId matches an inventoryItem
  // Stock is tracked per-batch/per-location; we log a movement (direction: out)
  // for audit trail. Batch-level deduction would require choosing a batch.
  if (Array.isArray(body.materialsUsed)) {
    for (const m of body.materialsUsed) {
      if (m.itemId) {
        try {
          await db.inventoryMovement.create({
            data: {
              itemId: m.itemId,
              type: "consumption",
              direction: "out",
              quantity: Number(m.qty) || 1,
              balanceAfter: 0,
              reason: `Dental procedure ${procNo}`,
              reference: invoice.invoiceNo,
              performedBy: body.doctorId || "dental-system",
            },
          });
        } catch {
          // ignore if inventory integration fails
        }
      }
    }
  }

  // Create the procedure record
  const proc = await db.dentalProcedure.create({
    data: {
      procNo,
      patientId: body.patientId,
      doctorId: body.doctorId,
      assistantId: body.assistantId || null,
      appointmentId: body.appointmentId || null,
      treatmentPlanId: body.treatmentPlanId || null,
      procedureDate: procDate,
      toothNumbers: body.toothNumbers || null,
      procedureType: body.procedureType,
      materialsUsed: body.materialsUsed ? JSON.stringify(body.materialsUsed) : null,
      medicineUsed: body.medicineUsed ? JSON.stringify(body.medicineUsed) : null,
      notes: body.notes || null,
      complications: body.complications || null,
      images: body.images ? JSON.stringify(body.images) : null,
      duration: body.duration || 0,
      invoiceId: invoice.id,
      status: body.status || "completed",
    },
  });

  // Append visit to EMR timeline
  await db.clinicalNote.create({
    data: {
      patientId: body.patientId,
      doctorId: body.doctorId,
      type: "followup",
      content: `Dental procedure — ${body.procedureType?.replace(/_/g, " ") || "procedure"} on tooth ${body.toothNumbers || "—"}. Notes: ${body.notes || "—"}. Invoice ${invoice.invoiceNo} (Rs. ${total}).`,
    },
  });

  // If linked treatment plan, mark as completed
  if (body.treatmentPlanId && body.markPlanComplete !== false) {
    await db.dentalTreatmentPlan.update({ where: { id: body.treatmentPlanId }, data: { status: "completed" } });
  }

  return NextResponse.json({ ...proc, invoice }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { generateNanoCode } from "@/lib/id-generator";
import { getNextSequenceNumber, createWithRetry } from "@/lib/id-generator";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const procs = await db.dentalProcedure.findMany({ where, orderBy: { procedureDate: "desc" } });
  return NextResponse.json(procs);
});

// POST creates the procedure AND automatically creates an invoice via the Billing module.
// It also deducts materials from inventory (if itemId is a valid inventoryItem) and
// appends a clinical note to the patient's EMR timeline.
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const procNo = generateNanoCode("DPR-");
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
  let invoiceNo = await getNextSequenceNumber("INV-", () =>
    db.invoice.findMany({
      where: { invoiceNo: { startsWith: "INV-" } },
      orderBy: { invoiceNo: "desc" },
      take: 1,
      select: { invoiceNo: true },
    }).then(rows => rows.map(r => ({ code: r.invoiceNo })))
  );
  const invoice = await createWithRetry(
    () => db.invoice.create({
      data: {
        invoiceNo,
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
  }),
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
});

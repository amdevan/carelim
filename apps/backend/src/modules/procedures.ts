/**
 * Generic Procedures module for the General clinic type (port of the dental
 * procedures workflow, minus dental-specific fields). Serial PROC- codes,
 * auto-invoice via Billing, EMR timeline note. Tenant isolation via
 * lib/prisma.ts ("procedure" is in TENANT_MODELS).
 */
import { Router, Request, Response } from "express";
import { db, rawDb } from "../lib/prisma";
import { fail } from "../lib/http";

const MAX_RETRIES = 5;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Next serial for a prefix by scanning ALL prefix-matching codes in the
 * tenant. Legacy rows with random suffixes sort above serials and must not
 * poison the sequence (regex `^prefix\d+$` only, Math.max). */
async function getNextSequenceNumber(
  prefix: string,
  latestQuery: () => Promise<{ code: string }[]>
): Promise<string> {
  const latest = await latestQuery();
  const nums = latest
    .map((r) => r.code.match(new RegExp(`^${escapeRegex(prefix)}(\\d+)$`)))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => parseInt(m[1], 10));
  const nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

/** Create with unique-code retry on P2002. */
async function createWithRetry<T>(
  createFn: () => Promise<T>,
  regenerateFn: () => Promise<void>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await createFn();
    } catch (e: any) {
      if (e?.code !== "P2002" || attempt === MAX_RETRIES - 1) throw e;
      await regenerateFn();
    }
  }
  throw new Error("unreachable");
}

const nextProcNo = () =>
  getNextSequenceNumber("PROC-", () =>
    db.procedure
      .findMany({ where: { procNo: { startsWith: "PROC-" } }, select: { procNo: true } })
      .then((rows) => rows.map((r) => ({ code: r.procNo })))
  );

// ─── Handlers ─────────────────────────────────────────────────────
async function listProcedures(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const category = req.query.category as string | undefined;
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (category) where.category = category;
  const procs = await db.procedure.findMany({ where, orderBy: { procedureDate: "desc" } });
  res.json(procs);
}

// POST creates the procedure AND automatically creates an invoice via the
// Billing module, and appends a clinical note to the patient's EMR timeline.
async function createProcedure(req: Request, res: Response) {
  const body = req.body || {};
  if (!body.patientId || !body.procedureName) {
    return fail(res, 400, "patientId and procedureName are required");
  }
  const procNo = await nextProcNo();
  const procDate = body.procedureDate ? new Date(body.procedureDate) : new Date();

  // Auto-invoice via Billing module (13% VAT, like dental procedures)
  const cost = body.fee != null && Number(body.fee) > 0 ? Number(body.fee) : 1000;
  const tax = Math.round(cost * 0.13);
  const total = cost + tax;

  // invoiceNo is globally unique (Invoice has no tenantId column) and the
  // tenant middleware resolves Invoice via branch.tenantId — which would hide
  // null-branch auto-invoices from the scan. Scan ALL invoices via rawDb.
  const nextInvoiceNo = () =>
    getNextSequenceNumber("INV-", () =>
      rawDb.invoice
        .findMany({ where: { invoiceNo: { startsWith: "INV-" } }, select: { invoiceNo: true } })
        .then((rows) => rows.map((r) => ({ code: r.invoiceNo })))
    );
  let invoiceNo = await nextInvoiceNo();
  const invoice = await createWithRetry(
    () =>
      db.invoice.create({
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
          items: {
            create: [{ description: `Procedure — ${body.procedureName}`, qty: 1, rate: cost, amount: cost }],
          },
        } as never,
      }),
    async () => {
      invoiceNo = await nextInvoiceNo();
    }
  );
  await db.auditLog.create({
    data: {
      user: body.doctorId || "system",
      action: "CREATE",
      module: "Billing",
      detail: `Auto-invoice ${invoice.invoiceNo} for procedure ${procNo}`,
    } as never,
  });

  const proc = await db.procedure.create({
    data: {
      procNo,
      patientId: body.patientId,
      doctorId: body.doctorId || null,
      assistantId: body.assistantId || null,
      appointmentId: body.appointmentId || null,
      procedureName: body.procedureName,
      category: body.category || null,
      procedureDate: procDate,
      fee: cost,
      duration: Number(body.duration) || 0,
      notes: body.notes || null,
      complications: body.complications || null,
      invoiceId: invoice.id,
      status: body.status || "completed",
    } as never,
  });

  // Append visit to EMR timeline
  await db.clinicalNote.create({
    data: {
      patientId: body.patientId,
      doctorId: body.doctorId,
      type: "followup",
      content: `Procedure — ${body.procedureName}${body.category ? ` (${body.category.replace(/_/g, " ")})` : ""}. Notes: ${body.notes || "—"}. Invoice ${invoice.invoiceNo} (Rs. ${total}).`,
    } as never,
  });

  res.status(201).json({ ...proc, invoice });
}

async function getProcedure(req: Request, res: Response) {
  const proc = await db.procedure.findUnique({ where: { id: req.params.id as string } });
  if (!proc) return fail(res, 404, "Not found");
  res.json(proc);
}

async function updateProcedure(req: Request, res: Response) {
  const body = req.body || {};
  const existing = await db.procedure.findUnique({ where: { id: req.params.id as string } });
  if (!existing) return fail(res, 404, "Not found");
  const data: Record<string, unknown> = { ...body };
  if (body.procedureDate) data.procedureDate = new Date(body.procedureDate);
  if (body.fee != null) data.fee = Number(body.fee) || 0;
  if (body.duration != null) data.duration = Number(body.duration) || 0;
  delete data.invoiceId; // financial link is not editable
  const proc = await db.procedure.update({ where: { id: req.params.id as string }, data: data as never });
  res.json(proc);
}

async function deleteProcedure(req: Request, res: Response) {
  const proc = await db.procedure.findUnique({ where: { id: req.params.id as string } });
  if (!proc) return fail(res, 404, "Not found");
  // Keep the financial trail: mark the linked invoice refunded instead of deleting it.
  // rawDb bypasses the branch filter — auto-invoices have branchId null, and the
  // tenant middleware resolves Invoice via branch.tenantId (update would no-op).
  // Tenant safety: proc was fetched via the tenant-scoped db.
  if (proc?.invoiceId) {
    await rawDb.invoice.update({ where: { id: proc.invoiceId }, data: { status: "refunded" } }).catch(() => {});
  }
  await db.procedure.delete({ where: { id: req.params.id as string } });
  res.json({ ok: true });
}

export function proceduresRouter(): Router {
  const r = Router();
  r.get("/", listProcedures);
  r.post("/", createProcedure);
  r.get("/:id", getProcedure);
  r.put("/:id", updateProcedure);
  r.delete("/:id", deleteProcedure);
  return r;
}
/**
 * Dental module — port of frontend /api/dental-* routes:
 * dental-dashboard, dental-examinations, dental-followups, dental-images,
 * dental-implant-cases, dental-lab-orders, dental-odontograms,
 * dental-ortho-cases, dental-procedures, dental-reports, dental-treatment-plans.
 * Tenant isolation enforced by lib/prisma.ts (all dental models are in TENANT_MODELS).
 */
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db, rawDb } from "../lib/prisma";
import { fail, wrap } from "../lib/http";

// ─── Inlined helpers (frontend lib/id-generator.ts + nanoid) ──────
const NANOID_ALPHABET =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

function nanoid(size: number): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) id += NANOID_ALPHABET[bytes[i] % NANOID_ALPHABET.length];
  return id;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MAX_RETRIES = 5;

/**
 * Generate the next sequential number for a prefix by reading the latest code.
 * Caller should wrap in a try/catch and retry on Prisma P2002 (unique constraint).
 */
async function getNextSequenceNumber(
  prefix: string,
  latestQuery: () => Promise<{ code: string }[]>
): Promise<string> {
  const latest = await latestQuery();
  // Only consider codes that are exactly `prefix + digits`. Legacy rows with
  // random/alphanumeric suffixes sort above serials and must not poison the
  // sequence (they made creation collide forever).
  const nums = latest
    .map(r => r.code.match(new RegExp(`^${escapeRegex(prefix)}(\\d+)$`)))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => parseInt(m[1], 10));
  const nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

/**
 * Create a record with unique code, retrying on P2002 (unique constraint violation).
 * The DB enforces uniqueness, and we retry on conflict.
 */
async function createWithRetry<T>(
  createFn: () => Promise<T>,
  regenerateFn: () => Promise<void>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await createFn();
    } catch (error: any) {
      if (error?.code === "P2002") {
        // Unique constraint violation — regenerate the code and retry
        await regenerateFn();
        continue;
      }
      throw error; // Non-constraint errors propagate immediately
    }
  }
  throw new Error(`Failed to create record after ${MAX_RETRIES} attempts (unique constraint conflicts)`);
}

function generateNanoCode(prefix: string, length: number = 8): string {
  return `${prefix}${nanoid(length).toUpperCase()}`;
}

// ─── Dental dashboard ─────────────────────────────────────────────
async function getDentalDashboard(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const branchFilter = branchId ? { branchId } : {};
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [exams, plans, procedures, labOrders, orthoCases, implantCases, followups, images] = await Promise.all([
    db.dentalExamination.findMany(),
    db.dentalTreatmentPlan.findMany(),
    db.dentalProcedure.findMany(),
    db.dentalLabOrder.findMany(),
    db.orthodonticCase.findMany(),
    db.implantCase.findMany(),
    db.dentalFollowup.findMany(),
    db.dentalImage.findMany(),
  ]);

  const todayProcedures = procedures.filter((p) => p.procedureDate >= startOfDay);
  const todayExams = exams.filter((e) => e.examDate >= startOfDay);
  const monthProcedures = procedures.filter((p) => p.procedureDate >= startOfMonth);

  // Revenue from procedures (via invoices) — approximate from procedures' invoice totals
  const todayRevenue = todayProcedures.reduce((s, p) => s + (p.invoiceId ? 1 : 0) * 0, 0);
  // Better: fetch invoices linked to dental procedures
  const dentalInvoices = procedures.filter((p) => p.invoiceId).map((p) => p.invoiceId!);
  const invoices = dentalInvoices.length > 0 ? await db.invoice.findMany({ where: { id: { in: dentalInvoices } } }) : [];
  const totalRevenue = invoices.reduce((s, i) => s + i.paid, 0);
  const monthRevenue = invoices.filter((i) => i.date >= startOfMonth).reduce((s, i) => s + i.paid, 0);

  // Appointments for dental — we infer from procedures+exams; reuse real appointments today
  const upcomingAppts = await db.appointment.findMany({
    where: { date: { gte: startOfDay }, status: { in: ["scheduled", "checked-in"] } },
    take: 6,
    orderBy: { date: "asc" },
  });

  const pendingTreatments = plans.filter((p) => ["planned", "approved", "in_progress"].includes(p.status));
  const completedProcedures = procedures.filter((p) => p.status === "completed");

  // Treatment statistics by type
  const procByType: Record<string, number> = {};
  procedures.forEach((p) => { procByType[p.procedureType] = (procByType[p.procedureType] || 0) + 1; });

  const planByType: Record<string, number> = {};
  plans.forEach((p) => { planByType[p.treatmentType] = (planByType[p.treatmentType] || 0) + 1; });

  // Status distributions
  const planStatus: Record<string, number> = {};
  plans.forEach((p) => { planStatus[p.status] = (planStatus[p.status] || 0) + 1; });

  const labStatus: Record<string, number> = {};
  labOrders.forEach((l) => { labStatus[l.status] = (labStatus[l.status] || 0) + 1; });

  const orthoStatus: Record<string, number> = {};
  orthoCases.forEach((o) => { orthoStatus[o.status] = (orthoStatus[o.status] || 0) + 1; });

  const implantStatus: Record<string, number> = {};
  implantCases.forEach((i) => { implantStatus[i.status] = (implantStatus[i.status] || 0) + 1; });

  // 6-month procedure & revenue trend
  const trend: { month: string; procedures: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const mp = procedures.filter((p) => p.procedureDate >= d && p.procedureDate < dn);
    const mInv = invoices.filter((iv) => iv.date >= d && iv.date < dn);
    trend.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      procedures: mp.length,
      revenue: mInv.reduce((s, iv) => s + iv.paid, 0),
    });
  }

  // Doctor schedule today (reuse appointments)
  const doctorSchedule = await db.appointment.findMany({
    where: { date: { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86400000) }, status: { in: ["scheduled", "checked-in", "in-consult"] } },
    include: { doctor: true, patient: true },
    orderBy: { time: "asc" },
  });

  res.json({
    kpis: {
      todayPatients: todayExams.length,
      todayProcedures: todayProcedures.length,
      upcomingAppointments: upcomingAppts.length,
      revenue: monthRevenue,
      totalRevenue,
      pendingTreatments: pendingTreatments.length,
      completedProcedures: completedProcedures.length,
      activeOrthoCases: orthoCases.filter((o) => o.status === "active").length,
      activeImplants: implantCases.filter((i) => ["placed", "osseointegrating"].includes(i.status)).length,
      pendingLabOrders: labOrders.filter((l) => ["pending", "in_lab"].includes(l.status)).length,
      upcomingFollowups: followups.filter((f) => f.status === "scheduled" && f.scheduledDate >= startOfDay).length,
      totalExaminations: exams.length,
      totalImages: images.length,
    },
    procByType,
    planByType,
    planStatus,
    labStatus,
    orthoStatus,
    implantStatus,
    trend,
    recentProcedures: procedures.slice(0, 6).map((p) => ({ id: p.id, procNo: p.procNo, patientId: p.patientId, procedureType: p.procedureType, toothNumbers: p.toothNumbers, procedureDate: p.procedureDate, status: p.status })),
    upcomingFollowups: followups.filter((f) => f.status === "scheduled").sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()).slice(0, 6).map((f) => ({ id: f.id, followupNo: f.followupNo, patientId: f.patientId, type: f.type, scheduledDate: f.scheduledDate, status: f.status })),
    doctorSchedule: doctorSchedule.slice(0, 8).map((a) => ({ id: a.id, time: a.time, patientName: a.patient.name, doctorName: a.doctor?.name || "—", status: a.status, reason: a.reason })),
    pendingLabOrdersList: labOrders.filter((l) => ["pending", "in_lab"].includes(l.status)).slice(0, 5).map((l) => ({ id: l.id, orderNo: l.orderNo, patientId: l.patientId, labType: l.labType, status: l.status, sentDate: l.sentDate, deliveryDate: l.deliveryDate })),
  });
}

// ─── Dental examinations ──────────────────────────────────────────
async function listExaminations(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const where = patientId ? { patientId } : {};
  const exams = await db.dentalExamination.findMany({
    where,
    orderBy: { examDate: "desc" },
  });
  res.json(exams);
}

async function createExamination(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.dentalExamination.count();
  const exam = await db.dentalExamination.create({
    data: {
      ...body,
      examNo: `DEX-${nanoid(8).toUpperCase()}`,
      examDate: body.examDate ? new Date(body.examDate) : new Date(),
    } as never,
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created dental examination ${exam.examNo}` } });
  res.status(201).json(exam);
}

async function getExamination(req: Request, res: Response) {
  const id = req.params.id as string;
  const exam = await db.dentalExamination.findUnique({ where: { id } });
  if (!exam) return fail(res, 404, "Not found");
  res.json(exam);
}

async function updateExamination(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.examDate) data.examDate = new Date(body.examDate);
  const exam = await db.dentalExamination.update({ where: { id }, data: data as never });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "UPDATE", module: "Dental", detail: `Updated dental examination ${exam.examNo}` } });
  res.json(exam);
}

async function deleteExamination(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.dentalExamination.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Dental follow-ups ────────────────────────────────────────────
async function listFollowups(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const status = req.query.status as string | undefined;
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  const followups = await db.dentalFollowup.findMany({ where, orderBy: { scheduledDate: "asc" } });
  res.json(followups);
}

async function createFollowup(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.dentalFollowup.count();
  const f = await db.dentalFollowup.create({
    data: {
      ...body,
      followupNo: `DFU-${nanoid(8).toUpperCase()}`,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
      completedDate: body.completedDate ? new Date(body.completedDate) : null,
    } as never,
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Scheduled follow-up ${f.followupNo} (${f.type})` } });
  res.status(201).json(f);
}

async function getFollowup(req: Request, res: Response) {
  const id = req.params.id as string;
  const f = await db.dentalFollowup.findUnique({ where: { id } });
  if (!f) return fail(res, 404, "Not found");
  res.json(f);
}

async function updateFollowup(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.scheduledDate) data.scheduledDate = new Date(body.scheduledDate);
  if (body.completedDate) data.completedDate = new Date(body.completedDate);
  const f = await db.dentalFollowup.update({ where: { id }, data: data as never });
  res.json(f);
}

async function deleteFollowup(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.dentalFollowup.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Dental images ────────────────────────────────────────────────
async function listImages(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const imageType = req.query.imageType as string | undefined;
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (imageType) where.imageType = imageType;
  const imgs = await db.dentalImage.findMany({ where, orderBy: { takenAt: "desc" } });
  res.json(imgs);
}

async function createImage(req: Request, res: Response) {
  const body = req.body || {};
  const img = await db.dentalImage.create({
    data: {
      ...body,
      takenAt: body.takenAt ? new Date(body.takenAt) : new Date(),
      annotation: body.annotation ? (typeof body.annotation === "object" ? JSON.stringify(body.annotation) : body.annotation) : null,
    } as never,
  });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Dental", detail: `Added dental image (${body.imageType}) for patient ${body.patientId}` } });
  res.status(201).json(img);
}

async function getImage(req: Request, res: Response) {
  const id = req.params.id as string;
  const img = await db.dentalImage.findUnique({ where: { id } });
  if (!img) return fail(res, 404, "Not found");
  res.json(img);
}

async function updateImage(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.takenAt) data.takenAt = new Date(body.takenAt);
  if (body.annotation && typeof body.annotation === "object") data.annotation = JSON.stringify(body.annotation);
  const img = await db.dentalImage.update({ where: { id }, data: data as never });
  res.json(img);
}

async function deleteImage(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.dentalImage.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Dental implant cases ─────────────────────────────────────────
async function listImplantCases(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const where = patientId ? { patientId } : {};
  const cases = await db.implantCase.findMany({ where, orderBy: { placementDate: "desc" } });
  res.json(cases);
}

async function createImplantCase(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.implantCase.count();
  const c = await db.implantCase.create({
    data: {
      ...body,
      caseNo: `IMP-${nanoid(8).toUpperCase()}`,
      placementDate: body.placementDate ? new Date(body.placementDate) : new Date(),
      abutmentDate: body.abutmentDate ? new Date(body.abutmentDate) : null,
      finalCrownDate: body.finalCrownDate ? new Date(body.finalCrownDate) : null,
    } as never,
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created implant case ${c.caseNo} — ${c.implantBrand}` } });
  res.status(201).json(c);
}

async function getImplantCase(req: Request, res: Response) {
  const id = req.params.id as string;
  const c = await db.implantCase.findUnique({ where: { id } });
  if (!c) return fail(res, 404, "Not found");
  res.json(c);
}

async function updateImplantCase(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.placementDate) data.placementDate = new Date(body.placementDate);
  if (body.abutmentDate) data.abutmentDate = new Date(body.abutmentDate);
  if (body.finalCrownDate) data.finalCrownDate = new Date(body.finalCrownDate);
  const c = await db.implantCase.update({ where: { id }, data: data as never });
  res.json(c);
}

async function deleteImplantCase(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.implantCase.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Dental lab orders ────────────────────────────────────────────
async function listLabOrders(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const status = req.query.status as string | undefined;
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  const orders = await db.dentalLabOrder.findMany({ where, orderBy: { sentDate: "desc" } });
  res.json(orders);
}

async function createLabOrder(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.dentalLabOrder.count();
  const order = await db.dentalLabOrder.create({
    data: {
      ...body,
      orderNo: `DLO-${nanoid(8).toUpperCase()}`,
      sentDate: body.sentDate ? new Date(body.sentDate) : new Date(),
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      receivedDate: body.receivedDate ? new Date(body.receivedDate) : null,
    } as never,
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created lab order ${order.orderNo} (${order.labType})` } });
  res.status(201).json(order);
}

async function getLabOrder(req: Request, res: Response) {
  const id = req.params.id as string;
  const order = await db.dentalLabOrder.findUnique({ where: { id } });
  if (!order) return fail(res, 404, "Not found");
  res.json(order);
}

async function updateLabOrder(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.sentDate) data.sentDate = new Date(body.sentDate);
  if (body.deliveryDate) data.deliveryDate = new Date(body.deliveryDate);
  if (body.receivedDate) data.receivedDate = new Date(body.receivedDate);
  const order = await db.dentalLabOrder.update({ where: { id }, data: data as never });
  await db.auditLog.create({ data: { user: "system", action: "UPDATE", module: "Dental", detail: `Updated lab order ${order.orderNo} → ${body.status || ""}` } });
  res.json(order);
}

async function deleteLabOrder(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.dentalLabOrder.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Odontograms ──────────────────────────────────────────────────
async function listOdontograms(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const where = patientId ? { patientId } : {};
  const odos = await db.odontogram.findMany({
    where,
    include: { teeth: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(odos);
}

async function createOdontogram(req: Request, res: Response) {
  const body = req.body || {};
  const { teeth, ...rest } = body;
  const odo = await db.odontogram.create({
    data: {
      ...rest,
      teeth: teeth ? { create: teeth } : undefined,
    } as never,
    include: { teeth: true },
  });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Dental", detail: `Created odontogram for patient ${odo.patientId}` } });
  res.status(201).json(odo);
}

async function getOdontogram(req: Request, res: Response) {
  const id = req.params.id as string;
  const odo = await db.odontogram.findUnique({ where: { id }, include: { teeth: { orderBy: { toothNumber: "asc" } } } });
  if (!odo) return fail(res, 404, "Not found");
  res.json(odo);
}

async function updateOdontogram(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const odo = await db.odontogram.update({ where: { id }, data: { notes: body.notes, numberingSystem: body.numberingSystem }, include: { teeth: true } });
  res.json(odo);
}

async function deleteOdontogram(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.odontogram.delete({ where: { id } });
  res.json({ ok: true });
}

// Upsert a single tooth within the odontogram (toothNumber is the key)
async function upsertTooth(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  // body: { toothNumber, status, surfaces, conditions, notes, isPrimary }
  const existing = await db.tooth.findFirst({ where: { odontogramId: id, toothNumber: body.toothNumber } });
  let tooth;
  if (existing) {
    tooth = await db.tooth.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        surfaces: typeof body.surfaces === "object" ? JSON.stringify(body.surfaces) : body.surfaces,
        conditions: typeof body.conditions === "object" ? JSON.stringify(body.conditions) : body.conditions,
        notes: body.notes,
      },
    });
  } else {
    tooth = await db.tooth.create({
      data: {
        odontogramId: id,
        toothNumber: body.toothNumber,
        isPrimary: body.isPrimary || false,
        status: body.status || "sound",
        surfaces: typeof body.surfaces === "object" ? JSON.stringify(body.surfaces) : body.surfaces,
        conditions: typeof body.conditions === "object" ? JSON.stringify(body.conditions) : body.conditions,
        notes: body.notes,
      },
    });
  }
  await db.auditLog.create({ data: { user: "system", action: "UPDATE", module: "Dental", detail: `Updated tooth ${body.toothNumber} — ${body.status}` } });
  res.json(tooth);
}

// ─── Orthodontic cases ────────────────────────────────────────────
async function listOrthoCases(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const where = patientId ? { patientId } : {};
  const cases = await db.orthodonticCase.findMany({ where, orderBy: { startDate: "desc" } });
  res.json(cases);
}

async function createOrthoCase(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.orthodonticCase.count();
  const c = await db.orthodonticCase.create({
    data: {
      ...body,
      caseNo: `ORT-${nanoid(8).toUpperCase()}`,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      wireSequence: body.wireSequence ? (typeof body.wireSequence === "object" ? JSON.stringify(body.wireSequence) : body.wireSequence) : null,
      progressPhotos: body.progressPhotos ? (typeof body.progressPhotos === "object" ? JSON.stringify(body.progressPhotos) : body.progressPhotos) : null,
    } as never,
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created orthodontic case ${c.caseNo}` } });
  res.status(201).json(c);
}

async function getOrthoCase(req: Request, res: Response) {
  const id = req.params.id as string;
  const c = await db.orthodonticCase.findUnique({ where: { id } });
  if (!c) return fail(res, 404, "Not found");
  res.json(c);
}

async function updateOrthoCase(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  if (body.wireSequence && typeof body.wireSequence === "object") data.wireSequence = JSON.stringify(body.wireSequence);
  if (body.progressPhotos && typeof body.progressPhotos === "object") data.progressPhotos = JSON.stringify(body.progressPhotos);
  const c = await db.orthodonticCase.update({ where: { id }, data: data as never });
  res.json(c);
}

async function deleteOrthoCase(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.orthodonticCase.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Dental procedures ────────────────────────────────────────────
async function listProcedures(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const where = patientId ? { patientId } : {};
  const procs = await db.dentalProcedure.findMany({ where, orderBy: { procedureDate: "desc" } });
  res.json(procs);
}

// POST creates the procedure AND automatically creates an invoice via the Billing module.
// It also deducts materials from inventory (if itemId is a valid inventoryItem) and
// appends a clinical note to the patient's EMR timeline.
async function createProcedure(req: Request, res: Response) {
  const body = req.body || {};
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
  // Scan ALL invoices via rawDb — invoiceNo is globally unique and null-branch
  // auto-invoices are invisible to the branch-filtered tenant middleware.
  let invoiceNo = await getNextSequenceNumber("INV-", () =>
    rawDb.invoice.findMany({
      where: { invoiceNo: { startsWith: "INV-" } },
      select: { invoiceNo: true },
    }).then((rows) => rows.map((r) => ({ code: r.invoiceNo })))
  );
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
          items: { create: [{ description: `Dental — ${body.procedureType?.replace(/_/g, " ") || "procedure"} (${body.toothNumbers || "—"})`, qty: 1, rate: cost, amount: cost }] },
        } as never,
      }),
    async () => {
      invoiceNo = await getNextSequenceNumber("INV-", () =>
        rawDb.invoice.findMany({
          where: { invoiceNo: { startsWith: "INV-" } },
          select: { invoiceNo: true },
        }).then((rows) => rows.map((r) => ({ code: r.invoiceNo })))
      );
    }
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
            } as never,
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
    } as never,
  });

  // Append visit to EMR timeline
  await db.clinicalNote.create({
    data: {
      patientId: body.patientId,
      doctorId: body.doctorId,
      type: "followup",
      content: `Dental procedure — ${body.procedureType?.replace(/_/g, " ") || "procedure"} on tooth ${body.toothNumbers || "—"}. Notes: ${body.notes || "—"}. Invoice ${invoice.invoiceNo} (Rs. ${total}).`,
    } as never,
  });

  // If linked treatment plan, mark as completed
  if (body.treatmentPlanId && body.markPlanComplete !== false) {
    await db.dentalTreatmentPlan.update({ where: { id: body.treatmentPlanId }, data: { status: "completed" } });
  }

  res.status(201).json({ ...proc, invoice });
}

async function getProcedure(req: Request, res: Response) {
  const id = req.params.id as string;
  const proc = await db.dentalProcedure.findUnique({ where: { id } });
  if (!proc) return fail(res, 404, "Not found");
  res.json(proc);
}

async function updateProcedure(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.procedureDate) data.procedureDate = new Date(body.procedureDate);
  if (body.materialsUsed && typeof body.materialsUsed !== "string") data.materialsUsed = JSON.stringify(body.materialsUsed);
  if (body.medicineUsed && typeof body.medicineUsed !== "string") data.medicineUsed = JSON.stringify(body.medicineUsed);
  if (body.images && typeof body.images !== "string") data.images = JSON.stringify(body.images);
  const proc = await db.dentalProcedure.update({ where: { id }, data: data as never });
  res.json(proc);
}

async function deleteProcedure(req: Request, res: Response) {
  const id = req.params.id as string;
  const proc = await db.dentalProcedure.findUnique({ where: { id } });
  // Optionally null out the linked invoice instead of deleting it (keep financial trail)
  // rawDb bypasses the branch filter — auto-invoices have branchId null, and the
  // tenant middleware resolves Invoice via branch.tenantId (update would no-op).
  // Tenant safety: proc was fetched via the tenant-scoped db.
  if (proc?.invoiceId) {
    await rawDb.invoice.update({ where: { id: proc.invoiceId }, data: { status: "refunded" } }).catch(() => {});
  }
  await db.dentalProcedure.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Dental reports ───────────────────────────────────────────────
async function getDentalReports(req: Request, res: Response) {
  const fromStr = req.query.from as string | undefined;
  const toStr = req.query.to as string | undefined;
  const today = new Date();
  const from = fromStr ? new Date(fromStr) : new Date(today.getFullYear(), today.getMonth(), 1);
  const to = toStr ? new Date(toStr) : today;

  const [exams, plans, procedures, labOrders, orthoCases, implantCases, followups] = await Promise.all([
    db.dentalExamination.findMany({ where: { examDate: { gte: from, lte: to } } }),
    db.dentalTreatmentPlan.findMany({ where: { createdAt: { gte: from, lte: to } } }),
    db.dentalProcedure.findMany({ where: { procedureDate: { gte: from, lte: to } } }),
    db.dentalLabOrder.findMany({ where: { sentDate: { gte: from, lte: to } } }),
    db.orthodonticCase.findMany({ where: { startDate: { gte: from, lte: to } } }),
    db.implantCase.findMany({ where: { placementDate: { gte: from, lte: to } } }),
    db.dentalFollowup.findMany(),
  ]);

  // Revenue: pull invoices linked to procedures
  const dentalInvoicesIds = procedures.filter((p) => p.invoiceId).map((p) => p.invoiceId!);
  const invoices = dentalInvoicesIds.length > 0 ? await db.invoice.findMany({ where: { id: { in: dentalInvoicesIds } } }) : [];
  const totalRevenue = invoices.reduce((s, i) => s + i.paid, 0);

  // By doctor — aggregate procedures & revenue by doctorId
  const byDoctor: Record<string, { procedures: number; revenue: number; exams: number }> = {};
  for (const p of procedures) {
    const k = p.doctorId || "unassigned";
    byDoctor[k] = byDoctor[k] || { procedures: 0, revenue: 0, exams: 0 };
    byDoctor[k].procedures++;
  }
  for (const iv of invoices) {
    const proc = procedures.find((p) => p.invoiceId === iv.id);
    const k = proc?.doctorId || "unassigned";
    byDoctor[k] = byDoctor[k] || { procedures: 0, revenue: 0, exams: 0 };
    byDoctor[k].revenue += iv.paid;
  }
  for (const e of exams) {
    const k = e.doctorId || "unassigned";
    byDoctor[k] = byDoctor[k] || { procedures: 0, revenue: 0, exams: 0 };
    byDoctor[k].exams++;
  }
  const doctors = await db.doctor.findMany();
  const doctorMap: Record<string, string> = Object.fromEntries(doctors.map((d) => [d.id, d.name]));
  const byDoctorArray = Object.entries(byDoctor).map(([id, v]) => ({ doctorId: id, doctorName: doctorMap[id] || id, ...v }));

  // By procedure type
  const byType: Record<string, { count: number; revenue: number }> = {};
  for (const p of procedures) {
    byType[p.procedureType] = byType[p.procedureType] || { count: 0, revenue: 0 };
    byType[p.procedureType].count++;
    const inv = invoices.find((iv) => iv.id === p.invoiceId);
    if (inv) byType[p.procedureType].revenue += inv.paid;
  }

  // Tooth-wise treatment count
  const toothTreatments: Record<string, number> = {};
  for (const p of procedures) {
    if (!p.toothNumbers) continue;
    p.toothNumbers.split(",").map((s) => s.trim()).forEach((t) => {
      if (t) toothTreatments[t] = (toothTreatments[t] || 0) + 1;
    });
  }

  // Insurance claims — from invoices that have insuranceProvider on patient (demo: just count paid invoices)
  const insuranceClaims = invoices.filter((iv) => iv.status === "paid").length;

  res.json({
    period: { from, to },
    summary: {
      totalExaminations: exams.length,
      totalProcedures: procedures.length,
      totalPlans: plans.length,
      pendingPlans: plans.filter((p) => ["planned", "approved", "in_progress"].includes(p.status)).length,
      completedPlans: plans.filter((p) => p.status === "completed").length,
      totalRevenue,
      totalLabOrders: labOrders.length,
      pendingLabOrders: labOrders.filter((l) => ["pending", "in_lab"].includes(l.status)).length,
      totalOrthoCases: orthoCases.length,
      totalImplantCases: implantCases.length,
      totalFollowups: followups.length,
      pendingFollowups: followups.filter((f) => f.status === "scheduled").length,
      insuranceClaims,
    },
    byDoctor: byDoctorArray,
    byType: Object.entries(byType).map(([type, v]) => ({ treatmentType: type, ...v })),
    toothTreatments: Object.entries(toothTreatments).map(([tooth, count]) => ({ toothNumber: tooth, count })).sort((a, b) => b.count - a.count),
    procedures: procedures.map((p) => ({
      procNo: p.procNo,
      patientId: p.patientId,
      procedureType: p.procedureType,
      toothNumbers: p.toothNumbers,
      procedureDate: p.procedureDate,
      status: p.status,
      doctorId: p.doctorId,
      doctorName: doctorMap[p.doctorId || ""] || "—",
      revenue: invoices.find((iv) => iv.id === p.invoiceId)?.paid || 0,
    })),
  });
}

// ─── Dental treatment plans ───────────────────────────────────────
async function listTreatmentPlans(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const where = patientId ? { patientId } : {};
  const plans = await db.dentalTreatmentPlan.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(plans);
}

async function createTreatmentPlan(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.dentalTreatmentPlan.count();
  const plan = await db.dentalTreatmentPlan.create({
    data: {
      ...body,
      planNo: `DTP-${nanoid(8).toUpperCase()}`,
      consentDate: body.consentDate ? new Date(body.consentDate) : null,
    } as never,
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created treatment plan ${plan.planNo}` } });
  res.status(201).json(plan);
}

async function getTreatmentPlan(req: Request, res: Response) {
  const id = req.params.id as string;
  const plan = await db.dentalTreatmentPlan.findUnique({ where: { id } });
  if (!plan) return fail(res, 404, "Not found");
  res.json(plan);
}

async function updateTreatmentPlan(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.consentDate) data.consentDate = new Date(body.consentDate);
  const plan = await db.dentalTreatmentPlan.update({ where: { id }, data: data as never });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "UPDATE", module: "Dental", detail: `Updated treatment plan ${plan.planNo} → ${body.status || ""}` } });
  res.json(plan);
}

async function deleteTreatmentPlan(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.dentalTreatmentPlan.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Routers ──────────────────────────────────────────────────────
export function dentalDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(getDentalDashboard));
  return r;
}

export function dentalExaminationsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listExaminations));
  r.post("/", wrap(createExamination));
  r.get("/:id", wrap(getExamination));
  r.patch("/:id", wrap(updateExamination));
  r.delete("/:id", wrap(deleteExamination));
  return r;
}

export function dentalFollowupsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listFollowups));
  r.post("/", wrap(createFollowup));
  r.get("/:id", wrap(getFollowup));
  r.patch("/:id", wrap(updateFollowup));
  r.delete("/:id", wrap(deleteFollowup));
  return r;
}

export function dentalImagesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listImages));
  r.post("/", wrap(createImage));
  r.get("/:id", wrap(getImage));
  r.patch("/:id", wrap(updateImage));
  r.delete("/:id", wrap(deleteImage));
  return r;
}

export function dentalImplantCasesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listImplantCases));
  r.post("/", wrap(createImplantCase));
  r.get("/:id", wrap(getImplantCase));
  r.patch("/:id", wrap(updateImplantCase));
  r.delete("/:id", wrap(deleteImplantCase));
  return r;
}

export function dentalLabOrdersRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabOrders));
  r.post("/", wrap(createLabOrder));
  r.get("/:id", wrap(getLabOrder));
  r.patch("/:id", wrap(updateLabOrder));
  r.delete("/:id", wrap(deleteLabOrder));
  return r;
}

export function dentalOdontogramsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listOdontograms));
  r.post("/", wrap(createOdontogram));
  r.get("/:id", wrap(getOdontogram));
  r.patch("/:id", wrap(updateOdontogram));
  r.put("/:id", wrap(upsertTooth));
  r.delete("/:id", wrap(deleteOdontogram));
  return r;
}

export function dentalOrthoCasesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listOrthoCases));
  r.post("/", wrap(createOrthoCase));
  r.get("/:id", wrap(getOrthoCase));
  r.patch("/:id", wrap(updateOrthoCase));
  r.delete("/:id", wrap(deleteOrthoCase));
  return r;
}

export function dentalProceduresRouter(): Router {
  const r = Router();
  r.get("/", wrap(listProcedures));
  r.post("/", wrap(createProcedure));
  r.get("/:id", wrap(getProcedure));
  r.patch("/:id", wrap(updateProcedure));
  r.delete("/:id", wrap(deleteProcedure));
  return r;
}

export function dentalReportsRouter(): Router {
  const r = Router();
  r.get("/", wrap(getDentalReports));
  return r;
}

export function dentalTreatmentPlansRouter(): Router {
  const r = Router();
  r.get("/", wrap(listTreatmentPlans));
  r.post("/", wrap(createTreatmentPlan));
  r.get("/:id", wrap(getTreatmentPlan));
  r.patch("/:id", wrap(updateTreatmentPlan));
  r.delete("/:id", wrap(deleteTreatmentPlan));
  return r;
}
/**
 * IVF module — port of frontend /api/ivf-consents, /api/ivf-cycles,
 * /api/ivf-dashboard, /api/ivf-donors, /api/ivf-packages, /api/ivf-protocols,
 * /api/embryos, /api/egg-retrievals, /api/embryo-transfers,
 * /api/follicular-monitoring, /api/fertility-assessments,
 * /api/pregnancy-tracking, /api/cryobank, /api/semen-processing.
 * Tenant isolation enforced by lib/prisma.ts (all IVF models are in TENANT_MODELS).
 */
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "../lib/prisma";
import { fail, wrap } from "../lib/http";

const NANOID_ALPHABET =
  "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

/** Inline nanoid(size) replica — nanoid is not a backend dependency. */
function nanoid(size = 21): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) id += NANOID_ALPHABET[bytes[i] & 63];
  return id;
}

// ─── /api/ivf-consents ───────────────────────────────────────────

async function listIvfConsents(_req: Request, res: Response) {
  const c = await db.iVFConsent.findMany({ orderBy: { createdAt: "desc" } });
  res.json(c);
}

async function createIvfConsent(req: Request, res: Response) {
  const body = req.body || {};
  // count query kept from the original route (its result was unused there)
  await db.iVFConsent.count();
  const c = await db.iVFConsent.create({
    data: { ...body, consentNo: `CON-${nanoid(8).toUpperCase()}` } as never,
  });
  res.status(201).json(c);
}

async function updateIvfConsent(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.signedDate) data.signedDate = new Date(body.signedDate);
  const c = await db.iVFConsent.update({ where: { id }, data: data as never });
  res.json(c);
}

export function ivfConsentsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listIvfConsents));
  r.post("/", wrap(createIvfConsent));
  r.patch("/:id", wrap(updateIvfConsent));
  return r;
}

// ─── /api/ivf-cycles ─────────────────────────────────────────────

async function listIvfCycles(_req: Request, res: Response) {
  try {
    const cycles = await db.iVFCycle.findMany({
      include: {
        follicularRecords: { orderBy: { monitoringDate: "desc" }, take: 1 },
        embryoRecords: true,
        transfers: true,
        pregnancy: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(cycles);
  } catch (error) {
    console.error("Error fetching IVF cycles:", error);
    fail(res, 500, "Failed to fetch IVF cycles");
  }
}

async function createIvfCycle(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const cycle = await db.iVFCycle.create({
      data: {
        ...body,
        cycleNo: `IVF-${nanoid(8).toUpperCase()}`,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
      } as never,
    });
    await db.auditLog.create({
      data: {
        user: "system",
        action: "CREATE",
        module: "IVF",
        detail: `Created cycle ${cycle.cycleNo}`,
      },
    });
    res.status(201).json(cycle);
  } catch (error) {
    console.error("Error creating IVF cycle:", error);
    fail(res, 500, "Failed to create IVF cycle");
  }
}

async function getIvfCycle(req: Request, res: Response) {
  const id = req.params.id as string;
  const cycle = await db.iVFCycle.findUnique({
    where: { id },
    include: {
      follicularRecords: { orderBy: { monitoringDate: "asc" } },
      embryoRecords: true,
      transfers: true,
      pregnancy: true,
    },
  });
  if (!cycle) return fail(res, 404, "Not found");
  res.json(cycle);
}

async function updateIvfCycle(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.stimulationStart) data.stimulationStart = new Date(body.stimulationStart);
  if (body.opuDate) data.opuDate = new Date(body.opuDate);
  if (body.transferDate) data.transferDate = new Date(body.transferDate);
  const cycle = await db.iVFCycle.update({ where: { id }, data: data as never });
  res.json(cycle);
}

async function deleteIvfCycle(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.iVFCycle.delete({ where: { id } });
  res.json({ ok: true });
}

export function ivfCyclesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listIvfCycles));
  r.post("/", wrap(createIvfCycle));
  r.get("/:id", wrap(getIvfCycle));
  r.patch("/:id", wrap(updateIvfCycle));
  r.delete("/:id", wrap(deleteIvfCycle));
  return r;
}

// ─── /api/ivf-dashboard ──────────────────────────────────────────

async function getIvfDashboard(_req: Request, res: Response) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [cycles, activeCycles, assessments, embryos, transfers, pregnancies, donors, consents, packages, protocols] =
    await Promise.all([
      db.iVFCycle.findMany({ include: { follicularRecords: true, embryoRecords: true, transfers: true } }),
      db.iVFCycle.count({ where: { status: { in: ["stimulation", "monitoring", "opu", "transfer", "wait"] } } }),
      db.fertilityAssessment.count(),
      db.embryo.count(),
      db.embryoTransfer.count(),
      db.pregnancyFollowup.findMany(),
      db.donorProfile.findMany(),
      db.iVFConsent.count(),
      db.iVFPackage.findMany(),
      db.treatmentProtocol.findMany(),
    ]);

  const monthCycles = cycles.filter((c) => c.startDate >= startOfMonth);
  const activePregnancies = pregnancies.filter((p) => p.status === "tracking" || p.status === "ongoing");
  const positivePregnancies = pregnancies.filter((p) => p.result === "positive");
  const successRate = cycles.length > 0 ? Math.round((positivePregnancies.length / cycles.length) * 100) : 0;

  const statusCounts: Record<string, number> = {};
  cycles.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  const frozenEmbryos = await db.embryo.count({ where: { status: "frozen" } });
  const cryobankItems = await db.cryobankStorage.count();

  const cycleTrend: { month: string; cycles: number; pregnancies: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const mc = await db.iVFCycle.count({ where: { startDate: { gte: d, lt: dn } } });
    const mp = await db.pregnancyFollowup.count({ where: { testDate: { gte: d, lt: dn }, result: "positive" } });
    cycleTrend.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      cycles: mc,
      pregnancies: mp,
    });
  }

  res.json({
    kpis: {
      totalCycles: cycles.length,
      activeCycles,
      monthCycles: monthCycles.length,
      totalPatients: cycles.length,
      totalAssessments: assessments,
      totalEmbryos: embryos,
      frozenEmbryos,
      cryobankItems,
      totalTransfers: transfers,
      activePregnancies: activePregnancies.length,
      positivePregnancies: positivePregnancies.length,
      successRate,
      totalDonors: donors.length,
      pendingConsents: consents,
    },
    statusCounts,
    cycleTrend,
    protocols: protocols.map((p) => ({ id: p.id, name: p.name, code: p.code, type: p.type, duration: p.duration })),
    packages: packages.map((p) => ({ id: p.id, name: p.name, code: p.code, totalCost: p.totalCost })),
    recentCycles: cycles.slice(0, 5).map((c) => ({
      id: c.id,
      cycleNo: c.cycleNo,
      patientName: c.patientId,
      status: c.status,
      cycleNumber: c.cycleNumber,
      startDate: c.startDate,
    })),
    donors: donors.slice(0, 5).map((d) => ({
      id: d.id,
      donorCode: d.donorCode,
      type: d.type,
      screeningStatus: d.screeningStatus,
      status: d.status,
    })),
  });
}

export function ivfDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(getIvfDashboard));
  return r;
}

// ─── /api/ivf-donors ─────────────────────────────────────────────

async function listIvfDonors(_req: Request, res: Response) {
  const d = await db.donorProfile.findMany({ orderBy: { createdAt: "desc" } });
  res.json(d);
}

async function createIvfDonor(req: Request, res: Response) {
  const body = req.body || {};
  if (!body.donorCode) {
    const count = await db.donorProfile.count();
    body.donorCode = `DON-${String(count + 1).padStart(3, "0")}`;
  }
  const d = await db.donorProfile.create({ data: body });
  res.status(201).json(d);
}

async function updateIvfDonor(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const d = await db.donorProfile.update({ where: { id }, data: body });
  res.json(d);
}

async function deleteIvfDonor(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.donorProfile.delete({ where: { id } });
  res.json({ ok: true });
}

export function ivfDonorsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listIvfDonors));
  r.post("/", wrap(createIvfDonor));
  r.patch("/:id", wrap(updateIvfDonor));
  r.delete("/:id", wrap(deleteIvfDonor));
  return r;
}

// ─── /api/ivf-packages ───────────────────────────────────────────

async function listIvfPackages(_req: Request, res: Response) {
  const p = await db.iVFPackage.findMany({ orderBy: { name: "asc" } });
  res.json(p);
}

export function ivfPackagesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listIvfPackages));
  return r;
}

// ─── /api/ivf-protocols ──────────────────────────────────────────

async function listIvfProtocols(_req: Request, res: Response) {
  const p = await db.treatmentProtocol.findMany({ orderBy: { name: "asc" } });
  res.json(p);
}

export function ivfProtocolsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listIvfProtocols));
  return r;
}

// ─── /api/embryos ────────────────────────────────────────────────

async function listEmbryos(req: Request, res: Response) {
  const cycleId = req.query.cycleId as string | undefined;
  const where: Record<string, unknown> = {};
  if (cycleId) where.cycleId = cycleId;
  const e = await db.embryo.findMany({ where, orderBy: { embryoNo: "asc" } });
  res.json(e);
}

async function createEmbryo(req: Request, res: Response) {
  const body = req.body || {};
  const e = await db.embryo.create({ data: body });
  res.status(201).json(e);
}

async function updateEmbryo(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.frozenDate) data.frozenDate = new Date(body.frozenDate);
  const e = await db.embryo.update({ where: { id }, data: data as never });
  res.json(e);
}

export function embryosRouter(): Router {
  const r = Router();
  r.get("/", wrap(listEmbryos));
  r.post("/", wrap(createEmbryo));
  r.patch("/:id", wrap(updateEmbryo));
  return r;
}

// ─── /api/egg-retrievals ─────────────────────────────────────────

async function listEggRetrievals(_req: Request, res: Response) {
  const r = await db.eggRetrieval.findMany({ orderBy: { opuDate: "desc" } });
  res.json(r);
}

async function createEggRetrieval(req: Request, res: Response) {
  const body = req.body || {};
  const r = await db.eggRetrieval.create({
    data: { ...body, opuDate: body.opuDate ? new Date(body.opuDate) : new Date() } as never,
  });
  res.status(201).json(r);
}

async function updateEggRetrieval(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const r = await db.eggRetrieval.update({ where: { id }, data: body });
  res.json(r);
}

export function eggRetrievalsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listEggRetrievals));
  r.post("/", wrap(createEggRetrieval));
  r.patch("/:id", wrap(updateEggRetrieval));
  return r;
}

// ─── /api/embryo-transfers ───────────────────────────────────────

async function listEmbryoTransfers(_req: Request, res: Response) {
  const t = await db.embryoTransfer.findMany({ orderBy: { transferDate: "desc" } });
  res.json(t);
}

async function createEmbryoTransfer(req: Request, res: Response) {
  const body = req.body || {};
  const t = await db.embryoTransfer.create({
    data: { ...body, transferDate: body.transferDate ? new Date(body.transferDate) : new Date() } as never,
  });
  res.status(201).json(t);
}

async function updateEmbryoTransfer(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const t = await db.embryoTransfer.update({ where: { id }, data: body });
  res.json(t);
}

export function embryoTransfersRouter(): Router {
  const r = Router();
  r.get("/", wrap(listEmbryoTransfers));
  r.post("/", wrap(createEmbryoTransfer));
  r.patch("/:id", wrap(updateEmbryoTransfer));
  return r;
}

// ─── /api/follicular-monitoring ──────────────────────────────────

async function listFollicularMonitoring(req: Request, res: Response) {
  const cycleId = req.query.cycleId as string | undefined;
  const where: Record<string, unknown> = {};
  if (cycleId) where.cycleId = cycleId;
  const r = await db.follicularMonitoring.findMany({ where, orderBy: { monitoringDate: "asc" } });
  res.json(r);
}

async function createFollicularMonitoring(req: Request, res: Response) {
  const body = req.body || {};
  const r = await db.follicularMonitoring.create({
    data: { ...body, monitoringDate: body.monitoringDate ? new Date(body.monitoringDate) : new Date() } as never,
  });
  res.status(201).json(r);
}

export function follicularMonitoringRouter(): Router {
  const r = Router();
  r.get("/", wrap(listFollicularMonitoring));
  r.post("/", wrap(createFollicularMonitoring));
  return r;
}

// ─── /api/fertility-assessments ──────────────────────────────────

async function listFertilityAssessments(_req: Request, res: Response) {
  const a = await db.fertilityAssessment.findMany({ orderBy: { assessmentDate: "desc" } });
  res.json(a);
}

async function createFertilityAssessment(req: Request, res: Response) {
  const body = req.body || {};
  const a = await db.fertilityAssessment.create({
    data: { ...body, assessmentDate: body.assessmentDate ? new Date(body.assessmentDate) : new Date() } as never,
  });
  res.status(201).json(a);
}

export function fertilityAssessmentsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listFertilityAssessments));
  r.post("/", wrap(createFertilityAssessment));
  return r;
}

// ─── /api/pregnancy-tracking ─────────────────────────────────────

async function listPregnancyTracking(_req: Request, res: Response) {
  const p = await db.pregnancyFollowup.findMany({
    include: { cycle: true },
    orderBy: { testDate: "desc" },
  });
  res.json(p);
}

async function createPregnancyTracking(req: Request, res: Response) {
  const body = req.body || {};
  const p = await db.pregnancyFollowup.create({
    data: { ...body, testDate: body.testDate ? new Date(body.testDate) : new Date() } as never,
  });
  res.status(201).json(p);
}

async function updatePregnancyTracking(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.edd) data.edd = new Date(body.edd);
  const p = await db.pregnancyFollowup.update({ where: { id }, data: data as never });
  res.json(p);
}

export function pregnancyTrackingRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPregnancyTracking));
  r.post("/", wrap(createPregnancyTracking));
  r.patch("/:id", wrap(updatePregnancyTracking));
  return r;
}

// ─── /api/cryobank ───────────────────────────────────────────────

async function listCryobank(_req: Request, res: Response) {
  const c = await db.cryobankStorage.findMany({ orderBy: { freezeDate: "desc" } });
  res.json(c);
}

async function createCryobank(req: Request, res: Response) {
  const body = req.body || {};
  // count query kept from the original route (its result was unused there)
  await db.cryobankStorage.count();
  const c = await db.cryobankStorage.create({
    data: {
      ...body,
      barcode: `CRYO-${nanoid(8).toUpperCase()}`,
      freezeDate: body.freezeDate ? new Date(body.freezeDate) : new Date(),
    } as never,
  });
  res.status(201).json(c);
}

async function updateCryobank(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const c = await db.cryobankStorage.update({ where: { id }, data: body });
  res.json(c);
}

async function deleteCryobank(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.cryobankStorage.delete({ where: { id } });
  res.json({ ok: true });
}

export function cryobankRouter(): Router {
  const r = Router();
  r.get("/", wrap(listCryobank));
  r.post("/", wrap(createCryobank));
  r.patch("/:id", wrap(updateCryobank));
  r.delete("/:id", wrap(deleteCryobank));
  return r;
}

// ─── /api/semen-processing ───────────────────────────────────────

async function listSemenProcessing(_req: Request, res: Response) {
  const s = await db.semenProcessing.findMany({ orderBy: { collectionDate: "desc" } });
  res.json(s);
}

async function createSemenProcessing(req: Request, res: Response) {
  const body = req.body || {};
  const s = await db.semenProcessing.create({
    data: { ...body, collectionDate: body.collectionDate ? new Date(body.collectionDate) : new Date() } as never,
  });
  res.status(201).json(s);
}

export function semenProcessingRouter(): Router {
  const r = Router();
  r.get("/", wrap(listSemenProcessing));
  r.post("/", wrap(createSemenProcessing));
  return r;
}
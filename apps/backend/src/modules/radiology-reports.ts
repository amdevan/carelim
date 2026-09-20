/**
 * Radiology & Reports module — port of frontend /api/radiology, /api/radiology-alerts,
 * /api/radiology-dashboard, /api/radiology-equipment, /api/radiology-modalities,
 * /api/radiology-schedules, /api/radiology-studies, /api/reports (+ /api/reports/all)
 * and /api/doctor-dashboard.
 * Tenant/branch isolation via lib/prisma.ts (radiology models are in TENANT_MODELS).
 */
import { Router, Request, Response } from "express";
import { db } from "../lib/prisma";
import { wrap } from "../lib/http";
import { getCurrentUserEmail } from "../lib/tenant-context";

// nanoid isn't a backend dependency — inline equivalent used identically at the
// call site (8 random URL-safe chars, uppercased there, e.g. `RAD-XXXXXXXX`).
const NANOID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
function nanoid(size: number): string {
  let id = "";
  for (let i = 0; i < size; i++) {
    id += NANOID_ALPHABET[Math.floor(Math.random() * NANOID_ALPHABET.length)];
  }
  return id;
}

// ─── /api/radiology (+ /api/radiology/[id]) ──────────────────────

async function listRadiologyTests(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const branchId = req.query.branchId as string | undefined;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  const tests = await db.radiologyTest.findMany({
    where,
    include: { patient: true },
    orderBy: { orderedAt: "desc" },
  });
  res.json(tests);
}

async function createRadiologyTest(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.radiologyTest.count();
  const test = await db.radiologyTest.create({
    data: { ...body, testCode: `RAD-${nanoid(8).toUpperCase()}`, orderedAt: new Date() },
  });
  await db.auditLog.create({
    data: {
      user: getCurrentUserEmail() || "system@carelim.health",
      action: "CREATE",
      module: "Radiology",
      detail: `Ordered ${body.modality} for patient`,
    },
  });
  res.status(201).json(test);
}

async function updateRadiologyTest(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "approved" || body.status === "reported") data.completedAt = new Date();
  const test = await db.radiologyTest.update({ where: { id }, data: data as never });
  res.json(test);
}

async function deleteRadiologyTest(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.radiologyTest.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── /api/radiology-alerts (+ /api/radiology-alerts/[id]) ────────

async function listRadiologyAlerts(_req: Request, res: Response) {
  const alerts = await db.radiologyAlert.findMany({ orderBy: { createdAt: "desc" } });
  res.json(alerts);
}

async function updateRadiologyAlert(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "acknowledged") { data.acknowledgedAt = new Date(); }
  const alert = await db.radiologyAlert.update({ where: { id }, data: data as never });
  res.json(alert);
}

// ─── /api/radiology-dashboard ────────────────────────────────────

async function getRadiologyDashboard(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const branchFilter = branchId ? { branchId } : {};
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [studies, todayStudies, alerts, equipment, modalities, schedules] = await Promise.all([
    db.radiologyStudy.findMany({ include: { patient: true, modality: true, images: true, report: true } }),
    db.radiologyStudy.findMany({ where: { createdAt: { gte: startOfDay, lt: endOfDay } }, include: { modality: true } }),
    db.radiologyAlert.findMany({ orderBy: { createdAt: "desc" } }),
    db.radiologyEquipment.findMany({ include: { modality: true } }),
    db.radiologyModality.findMany(),
    db.radiologySchedule.findMany({ where: { scheduledDate: { gte: startOfDay } } }),
  ]);

  const todayOrders = todayStudies.length;
  const pendingScans = studies.filter(s => s.status === "scheduled" || s.status === "in-progress").length;
  const urgentPending = studies.filter(s => (s.status === "scheduled" || s.status === "in-progress") && (s.priority === "urgent" || s.priority === "stat")).length;
  const completed = studies.filter(s => s.status === "completed" || s.status === "reported" || s.status === "released").length;
  const completionRate = studies.length > 0 ? Math.round((completed / studies.length) * 100) : 0;
  const todayRevenue = todayStudies.reduce((s, st) => s + (st.modality?.baseFee || 0) + (st.contrastUsed ? (st.modality?.contrastFee || 0) : 0), 0);

  // Critical alerts
  const criticalAlerts = alerts.filter(a => a.status === "active");
  const pendingReports = studies.filter(s => s.status === "completed" || s.status === "reported").length;

  // Average turnaround time
  const completedStudies = studies.filter(s => s.performedAt && s.releasedAt);
  const avgTAT = completedStudies.length > 0
    ? Math.round(completedStudies.reduce((s, st) => s + (st.releasedAt!.getTime() - st.performedAt!.getTime()) / 3600000, 0) / completedStudies.length * 10) / 10
    : 0;

  // Modality-wise volume
  const modalityVolume = modalities.map(m => ({
    name: m.name,
    count: studies.filter(s => s.modalityId === m.id).length,
    revenue: studies.filter(s => s.modalityId === m.id).reduce((sum, st) => sum + (m.baseFee || 0) + (st.contrastUsed ? (m.contrastFee || 0) : 0), 0),
  })).filter(m => m.count > 0);

  // Equipment utilization
  const equipmentUtil = equipment.map(e => ({
    name: e.name,
    modality: e.modality.name,
    utilization: e.utilizationPct,
    status: e.status,
  }));

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  studies.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });

  // Daily trend (7 days)
  const dailyTrend: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dayStudies = await db.radiologyStudy.findMany({ where: { createdAt: { gte: ds, lt: de } } });
    dailyTrend.push({ date: d.toLocaleDateString("en-US", { weekday: "short" }), count: dayStudies.length });
  }

  res.json({
    kpis: {
      todayOrders,
      pendingScans,
      urgentPending,
      completed,
      completionRate,
      todayRevenue,
      pendingReports,
      avgTAT,
      criticalAlerts: criticalAlerts.length,
    },
    modalityVolume,
    equipmentUtil,
    statusCounts,
    dailyTrend,
    criticalAlerts: criticalAlerts.map(a => ({
      id: a.id, patientName: a.patientName, modality: a.modality, bodyPart: a.bodyPart,
      finding: a.finding, severity: a.severity, aiConfidence: a.aiConfidence,
      doctorNotified: a.doctorNotified, smsSent: a.smsSent, erAlerted: a.erAlerted,
      createdAt: a.createdAt,
    })),
    waitingPatients: studies.filter(s => s.status === "scheduled").slice(0, 5).map(s => ({
      studyUid: s.studyUid, patientName: s.patient.name, modality: s.modality.name, bodyPart: s.bodyPart, priority: s.priority,
    })),
    upcomingSchedules: schedules.slice(0, 5).map(s => ({
      patientName: s.patientName, modality: s.modality, bodyPart: s.bodyPart, timeSlot: s.timeSlot, status: s.status,
    })),
  });
}

// ─── /api/radiology-equipment ────────────────────────────────────

async function listRadiologyEquipment(_req: Request, res: Response) {
  const equip = await db.radiologyEquipment.findMany({ include: { modality: true }, orderBy: { name: "asc" } });
  res.json(equip);
}

async function createRadiologyEquipment(req: Request, res: Response) {
  const body = req.body || {};
  if (!body.code) {
    const count = await db.radiologyEquipment.count();
    body.code = `RE-${String(count + 1).padStart(3, "0")}`;
  }
  const equip = await db.radiologyEquipment.create({ data: body });
  res.status(201).json(equip);
}

// ─── /api/radiology-modalities ───────────────────────────────────

async function listRadiologyModalities(_req: Request, res: Response) {
  const modalities = await db.radiologyModality.findMany({ include: { _count: { select: { equipment: true, studies: true } } }, orderBy: { name: "asc" } });
  res.json(modalities);
}

async function createRadiologyModality(req: Request, res: Response) {
  const body = req.body || {};
  if (!body.code) {
    const count = await db.radiologyModality.count();
    body.code = `RM-${String(count + 1).padStart(3, "0")}`;
  }
  const modality = await db.radiologyModality.create({ data: body });
  res.status(201).json(modality);
}

// ─── /api/radiology-schedules ────────────────────────────────────

async function listRadiologySchedules(_req: Request, res: Response) {
  const schedules = await db.radiologySchedule.findMany({ orderBy: { scheduledDate: "asc" } });
  res.json(schedules);
}

async function createRadiologySchedule(req: Request, res: Response) {
  const body = req.body || {};
  const sched = await db.radiologySchedule.create({ data: { ...body, scheduledDate: new Date(body.scheduledDate) } });
  res.status(201).json(sched);
}

// ─── /api/radiology-studies (+ /api/radiology-studies/[id]) ──────

async function listRadiologyStudies(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const modality = req.query.modality as string | undefined;
  const branchId = req.query.branchId as string | undefined;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  if (modality) where.modalityId = modality;
  const studies = await db.radiologyStudy.findMany({
    where,
    include: { patient: true, modality: true, images: true, report: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(studies);
}

async function createRadiologyStudy(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.radiologyStudy.count();
  const study = await db.radiologyStudy.create({
    data: {
      studyUid: `1.2.840.${Date.now()}.${count}`,
      patientId: body.patientId,
      modalityId: body.modalityId,
      bodyPart: body.bodyPart,
      status: "scheduled",
      priority: body.priority || "normal",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      clinicalHistory: body.clinicalHistory || null,
      contrastUsed: body.contrastUsed || false,
    },
    include: { patient: true, modality: true },
  });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Radiology", detail: `Created study ${study.studyUid}` } });
  res.status(201).json(study);
}

async function updateRadiologyStudy(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "in-progress" && !body.performedAt) data.performedAt = new Date();
  if (body.status === "reported") data.reportedAt = new Date();
  if (body.status === "released") data.releasedAt = new Date();
  const study = await db.radiologyStudy.update({ where: { id }, data: data as never, include: { patient: true, modality: true, images: true, report: true } });
  res.json(study);
}

async function deleteRadiologyStudy(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.radiologyStudy.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── /api/reports (+ /api/reports/all) ───────────────────────────

async function getReports(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const period = (req.query.period as string) || "month";
  const customStart = req.query.startDate as string | undefined;
  const customEnd = req.query.endDate as string | undefined;
  const branchFilter = branchId ? { branchId } : {};

  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;
  if (period === "custom" && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "week") {
    startDate = new Date(today); startDate.setDate(today.getDate() - 7);
  } else if (period === "quarter") {
    startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  } else if (period === "year") {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else if (period === "all") {
    startDate = new Date(2020, 0, 1);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // ============ Overview ============
  const invoices = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: startDate } }, include: { patient: true } });
  const appointments = await db.appointment.findMany({ where: { ...branchFilter, date: { gte: startDate } }, include: { patient: true, doctor: true } });
  const patients = await db.patient.findMany({ where: branchFilter, orderBy: { registeredAt: "desc" } });
  const doctors = await db.doctor.findMany({ where: branchFilter, include: { appointments: { where: { date: { gte: startDate } } } } });

  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalCollection = invoices.reduce((s, i) => s + i.paid, 0);
  const totalDue = invoices.reduce((s, i) => s + i.due, 0);

  const revenueByType: Record<string, number> = {};
  invoices.forEach(i => { revenueByType[i.type] = (revenueByType[i.type] || 0) + i.total; });
  const revenueByPayment: Record<string, number> = {};
  invoices.forEach(i => { if (i.paymentMethod) revenueByPayment[i.paymentMethod] = (revenueByPayment[i.paymentMethod] || 0) + i.paid; });

  const doctorPerf = doctors.map(d => ({
    name: d.name, patients: d.appointments.length, revenue: d.appointments.length * d.consultationFee,
  })).sort((a, b) => b.patients - a.patients).slice(0, 10);

  // Monthly revenue (last 6 months or within custom range)
  const monthlyRevenue: { month: string; revenue: number; collection: number; profit: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    // Group by month within custom range
    const ms = new Date(customStart);
    const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: cm, lt: dn } } });
      const rev = invs.reduce((s, j) => s + j.total, 0);
      const col = invs.reduce((s, j) => s + j.paid, 0);
      monthlyRevenue.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), revenue: rev, collection: col, profit: Math.round(rev * 0.3) });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: d, lt: dn } } });
      const rev = invs.reduce((s, j) => s + j.total, 0);
      const col = invs.reduce((s, j) => s + j.paid, 0);
      monthlyRevenue.push({ month: d.toLocaleDateString("en-US", { month: "short" }), revenue: rev, collection: col, profit: Math.round(rev * 0.3) });
    }
  }

  // Daily revenue (within date range)
  const dailyRevenue: { date: string; revenue: number; collection: number; due: number }[] = [];
  const dayCount = Math.min(Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000), 90);
  for (let i = dayCount; i >= 0; i--) {
    const d = new Date(endDate); d.setDate(endDate.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: ds, lt: de } } });
    dailyRevenue.push({
      date: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      revenue: invs.reduce((s, j) => s + j.total, 0),
      collection: invs.reduce((s, j) => s + j.paid, 0),
      due: invs.reduce((s, j) => s + j.due, 0),
    });
  }

  // ============ Expenses ============
  const expenses = await db.expense.findMany({ where: { ...branchFilter, date: { gte: startDate } }, orderBy: { date: "desc" } });
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });

  // ============ Patients ============
  const newPatientsMonth = patients.filter(p => new Date(p.registeredAt) >= startOfMonth).length;
  const patientByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const count = patients.filter(p => { const c = new Date(p.registeredAt); return c >= d && c < dn; }).length;
    patientByMonth.push({ month: d.toLocaleDateString("en-US", { month: "short" }), count });
  }

  // ============ Appointments ============
  const confirmedAppts = appointments.filter(a => a.status === "completed").length;
  const cancelledAppts = appointments.filter(a => a.status === "cancelled").length;
  const pendingAppts = appointments.filter(a => a.status === "scheduled").length;
  const noShowAppts = appointments.filter(a => a.status === "no-show").length;

  const apptByDoctor: { name: string; total: number; completed: number; cancelled: number }[] = [];
  doctors.forEach(d => {
    const docAppts = appointments.filter(a => a.doctorId === d.id);
    apptByDoctor.push({ name: d.name, total: docAppts.length, completed: docAppts.filter(a => a.status === "completed").length, cancelled: docAppts.filter(a => a.status === "cancelled").length });
  });

  const apptByDay: { day: string; count: number }[] = [];
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    apptByDay.push({ day, count: appointments.filter(a => new Date(a.date).toLocaleDateString("en-US", { weekday: "short" }) === day).length });
  });

  const apptByHour: { hour: string; count: number }[] = [];
  for (let h = 8; h <= 18; h++) {
    apptByHour.push({ hour: `${h}:00`, count: appointments.filter(a => a.time && parseInt(a.time.split(":")[0]) === h).length });
  }

  // ============ Finance ============
  const allInvoices = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: startDate } }, include: { patient: true, items: true } });
  const invoicesByType: Record<string, number> = {};
  allInvoices.forEach(i => { invoicesByType[i.type] = (invoicesByType[i.type] || 0) + i.total; });
  const paymentsByMethod: Record<string, number> = {};
  allInvoices.forEach(i => { if (i.paymentMethod) paymentsByMethod[i.paymentMethod] = (paymentsByMethod[i.paymentMethod] || 0) + i.paid; });

  const outstanding = allInvoices.filter(i => i.due > 0);
  const outstanding0_30 = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days <= 30; }).reduce((s, i) => s + i.due, 0);
  const outstanding31_60 = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days > 30 && days <= 60; }).reduce((s, i) => s + i.due, 0);
  const outstanding60plus = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days > 60; }).reduce((s, i) => s + i.due, 0);

  // ============ Pharmacy ============
  const pharmacySales = await db.pharmacySale.findMany({ where: { ...branchFilter, saleDate: { gte: startDate } } });
  const purchaseOrders = await db.purchaseOrder.findMany({ where: { orderDate: { gte: startDate } }, include: { items: true } });
  const medicines = await db.medicine.findMany({ where: branchFilter });

  const phSalesTotal = pharmacySales.reduce((s, ps) => s + ps.total, 0);
  const phSalesCollection = pharmacySales.reduce((s, ps) => s + ps.paidAmount, 0);
  const phPurchasesTotal = purchaseOrders.reduce((s, po) => s + po.totalAmount, 0);
  const phStockValue = medicines.reduce((s, m) => s + (m.stockQty * m.purchasePrice), 0);

  const expiry90 = new Date(today); expiry90.setDate(today.getDate() + 90);
  const expiringMedicines = medicines.filter(m => m.expiryDate && new Date(m.expiryDate) <= expiry90).map(m => ({
    name: m.name, batch: m.batchNo, expiry: m.expiryDate.toISOString(), stock: m.stockQty, status: new Date(m.expiryDate) < today ? "expired" : "expiring",
  }));

  const lowStockMedicines = medicines.filter(m => m.stockQty <= m.reorderLevel).map(m => ({
    name: m.name, stock: m.stockQty, reorder: m.reorderLevel,
  }));

  const monthlyPhSales: { month: string; sales: number; purchases: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    const ms = new Date(customStart); const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const sales = pharmacySales.filter(ps => { const dt = new Date(ps.saleDate); return dt >= cm && dt < dn; }).reduce((s, ps) => s + ps.total, 0);
      const purchases = purchaseOrders.filter(po => { const dt = new Date(po.orderDate); return dt >= cm && dt < dn; }).reduce((s, po) => s + po.totalAmount, 0);
      monthlyPhSales.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), sales, purchases });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const sales = pharmacySales.filter(ps => { const dt = new Date(ps.saleDate); return dt >= d && dt < dn; }).reduce((s, ps) => s + ps.total, 0);
      const purchases = purchaseOrders.filter(po => { const dt = new Date(po.orderDate); return dt >= d && dt < dn; }).reduce((s, po) => s + po.totalAmount, 0);
      monthlyPhSales.push({ month: d.toLocaleDateString("en-US", { month: "short" }), sales, purchases });
    }
  }

  // ============ Laboratory ============
  const labOrders = await db.labOrder.findMany({ include: { patient: true, items: { include: { test: true } }, samples: true, results: true }, orderBy: { orderedAt: "desc" } });

  const labOrdersTotal = labOrders.reduce((s, o) => s + o.totalAmount, 0);
  const labOrdersPaid = labOrders.reduce((s, o) => s + o.paidAmount, 0);
  const labPendingOrders = labOrders.filter(o => o.status === "ordered" || o.status === "collected").length;
  const labCompletedOrders = labOrders.filter(o => o.status === "completed").length;
  const labInProgressOrders = labOrders.filter(o => o.status === "processing").length;

  const labByStatus: Record<string, number> = {};
  labOrders.forEach(o => { labByStatus[o.status] = (labByStatus[o.status] || 0) + 1; });

  const testCounts: Record<string, number> = {};
  labOrders.forEach(o => { o.items.forEach(item => { const testName = (item as unknown as { test?: { name: string } }).test?.name || "Unknown"; testCounts[testName] = (testCounts[testName] || 0) + 1; }); });
  const labTestsPopularity = Object.entries(testCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const monthlyLabRevenue: { month: string; orders: number; revenue: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    const ms = new Date(customStart); const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const monthOrders = labOrders.filter(o => { const dt = new Date(o.orderedAt); return dt >= cm && dt < dn; });
      monthlyLabRevenue.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), orders: monthOrders.length, revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0) });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const monthOrders = labOrders.filter(o => { const dt = new Date(o.orderedAt); return dt >= d && dt < dn; });
      monthlyLabRevenue.push({ month: d.toLocaleDateString("en-US", { month: "short" }), orders: monthOrders.length, revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0) });
    }
  }

  // ============ Staff ============
  const staff = await db.staff.findMany({ where: branchFilter, include: { attendance: { where: { date: { gte: startDate } } } } });
  const staffAttendance: { name: string; present: number; absent: number; leave: number }[] = [];
  staff.slice(0, 10).forEach(s => {
    staffAttendance.push({ name: s.name, present: s.attendance.filter(a => a.status === "present").length, absent: s.attendance.filter(a => a.status === "absent").length, leave: s.attendance.filter(a => a.status === "leave").length });
  });
  const staffByDept: Record<string, number> = {};
  staff.forEach(s => { staffByDept[s.department || "Unassigned"] = (staffByDept[s.department || "Unassigned"] || 0) + 1; });

  // ============ Invoice List ============
  const invoiceList = allInvoices.map(i => ({
    id: i.id, invoiceNo: i.invoiceNo, patientName: i.patient?.name || "",
    type: i.type, total: i.total, paid: i.paid, due: i.due,
    date: i.date.toISOString(), status: i.status, paymentMethod: i.paymentMethod || "",
  }));

  res.json({
    totalRevenue, totalCollection, totalDue, revenueByType, revenueByPayment,
    doctorPerf, monthlyRevenue, dailyRevenue,
    patientCount: patients.length, appointmentCount: appointments.length,
    expensesTotal, netProfit: totalRevenue - expensesTotal,
    expenses: expenses.slice(0, 50), expenseByCategory,
    newPatientsMonth, patientByMonth,
    confirmedAppts, cancelledAppts, pendingAppts, noShowAppts,
    apptByDoctor, apptByDay, apptByHour,
    invoicesByType, paymentsByMethod, outstanding: outstanding.length,
    outstanding0_30, outstanding31_60, outstanding60plus, invoiceList,
    phSalesTotal, phSalesCollection, phPurchasesTotal, phStockValue,
    expiringMedicines, lowStockMedicines, monthlyPhSales,
    labOrdersTotal, labOrdersPaid, labOrdersDue: labOrdersTotal - labOrdersPaid,
    labPendingOrders, labCompletedOrders, labInProgressOrders,
    labByStatus, labTestsPopularity, monthlyLabRevenue,
    totalLabOrders: labOrders.length, totalLabTests: (await db.labTestMaster.count()),
    totalStaff: staff.length, activeStaff: staff.filter(s => s.status === "active").length,
    staffAttendance, staffByDept,
  });
}

async function getAllReports(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const period = (req.query.period as string) || "month";
  const customStart = req.query.startDate as string | undefined;
  const customEnd = req.query.endDate as string | undefined;
  const branchFilter = branchId ? { branchId } : {};

  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;
  if (period === "custom" && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "week") {
    startDate = new Date(today); startDate.setDate(today.getDate() - 7);
  } else if (period === "quarter") {
    startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  } else if (period === "year") {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else if (period === "all") {
    startDate = new Date(2020, 0, 1);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // ============ Overview ============
  const invoices = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: startDate } }, include: { patient: true } });
  const appointments = await db.appointment.findMany({ where: { ...branchFilter, date: { gte: startDate } } });
  const patients = await db.patient.findMany({ where: branchFilter, orderBy: { registeredAt: "desc" } });
  const doctors = await db.doctor.findMany({ where: branchFilter, include: { appointments: { where: { date: { gte: startDate } } } } });

  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalCollection = invoices.reduce((s, i) => s + i.paid, 0);
  const totalDue = invoices.reduce((s, i) => s + i.due, 0);

  const revenueByType: Record<string, number> = {};
  invoices.forEach(i => { revenueByType[i.type] = (revenueByType[i.type] || 0) + i.total; });
  const revenueByPayment: Record<string, number> = {};
  invoices.forEach(i => { if (i.paymentMethod) revenueByPayment[i.paymentMethod] = (revenueByPayment[i.paymentMethod] || 0) + i.paid; });

  const doctorPerf = doctors.map(d => ({
    name: d.name, patients: d.appointments.length, revenue: d.appointments.length * d.consultationFee,
  })).sort((a, b) => b.patients - a.patients).slice(0, 10);

  // Monthly revenue (last 6 months or within custom range)
  const monthlyRevenue: { month: string; revenue: number; collection: number; profit: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    const ms = new Date(customStart);
    const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: cm, lt: dn } } });
      const rev = invs.reduce((s, j) => s + j.total, 0);
      const col = invs.reduce((s, j) => s + j.paid, 0);
      monthlyRevenue.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), revenue: rev, collection: col, profit: Math.round(rev * 0.3) });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: d, lt: dn } } });
      const rev = invs.reduce((s, j) => s + j.total, 0);
      const col = invs.reduce((s, j) => s + j.paid, 0);
      monthlyRevenue.push({ month: d.toLocaleDateString("en-US", { month: "short" }), revenue: rev, collection: col, profit: Math.round(rev * 0.3) });
    }
  }

  // Daily revenue (within date range, capped at 90 days)
  const dailyRevenue: { date: string; revenue: number; collection: number; due: number }[] = [];
  const dayCount = Math.min(Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000), 90);
  for (let i = dayCount; i >= 0; i--) {
    const d = new Date(endDate); d.setDate(endDate.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: ds, lt: de } } });
    dailyRevenue.push({
      date: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      revenue: invs.reduce((s, j) => s + j.total, 0),
      collection: invs.reduce((s, j) => s + j.paid, 0),
      due: invs.reduce((s, j) => s + j.due, 0),
    });
  }

  // ============ Expenses ============
  const expenses = await db.expense.findMany({ where: { ...branchFilter, date: { gte: startDate } }, orderBy: { date: "desc" } });
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });

  // ============ Patients ============
  const newPatientsMonth = patients.filter(p => new Date(p.registeredAt) >= startOfMonth).length;
  const patientByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const count = patients.filter(p => { const c = new Date(p.registeredAt); return c >= d && c < dn; }).length;
    patientByMonth.push({ month: d.toLocaleDateString("en-US", { month: "short" }), count });
  }

  // ============ Appointments ============
  const confirmedAppts = appointments.filter(a => a.status === "completed").length;
  const cancelledAppts = appointments.filter(a => a.status === "cancelled").length;
  const pendingAppts = appointments.filter(a => a.status === "scheduled").length;
  const noShowAppts = appointments.filter(a => a.status === "no-show").length;

  const apptByDoctor: { name: string; total: number; completed: number; cancelled: number }[] = [];
  doctors.forEach(d => {
    const docAppts = appointments.filter(a => a.doctorId === d.id);
    apptByDoctor.push({ name: d.name, total: docAppts.length, completed: docAppts.filter(a => a.status === "completed").length, cancelled: docAppts.filter(a => a.status === "cancelled").length });
  });

  const apptByDay: { day: string; count: number }[] = [];
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    apptByDay.push({ day, count: appointments.filter(a => new Date(a.date).toLocaleDateString("en-US", { weekday: "short" }) === day).length });
  });

  const apptByHour: { hour: string; count: number }[] = [];
  for (let h = 8; h <= 18; h++) {
    apptByHour.push({ hour: `${h}:00`, count: appointments.filter(a => a.time && parseInt(a.time.split(":")[0]) === h).length });
  }

  // ============ Finance ============
  const allInvoices = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: startDate } }, include: { patient: true, items: true } });
  const invoicesByType: Record<string, number> = {};
  allInvoices.forEach(i => { invoicesByType[i.type] = (invoicesByType[i.type] || 0) + i.total; });
  const paymentsByMethod: Record<string, number> = {};
  allInvoices.forEach(i => { if (i.paymentMethod) paymentsByMethod[i.paymentMethod] = (paymentsByMethod[i.paymentMethod] || 0) + i.paid; });

  const outstanding = allInvoices.filter(i => i.due > 0);
  const outstanding0_30 = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days <= 30; }).reduce((s, i) => s + i.due, 0);
  const outstanding31_60 = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days > 30 && days <= 60; }).reduce((s, i) => s + i.due, 0);
  const outstanding60plus = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days > 60; }).reduce((s, i) => s + i.due, 0);

  // ============ Pharmacy ============
  const pharmacySales = await db.pharmacySale.findMany({ where: { ...branchFilter, saleDate: { gte: startDate } } });
  const purchaseOrders = await db.purchaseOrder.findMany({ where: { orderDate: { gte: startDate } }, include: { items: true } });
  const medicines = await db.medicine.findMany({ where: branchFilter });

  const phSalesTotal = pharmacySales.reduce((s, ps) => s + ps.total, 0);
  const phSalesCollection = pharmacySales.reduce((s, ps) => s + ps.paidAmount, 0);
  const phPurchasesTotal = purchaseOrders.reduce((s, po) => s + po.totalAmount, 0);
  const phStockValue = medicines.reduce((s, m) => s + (m.stockQty * m.purchasePrice), 0);

  const expiry90 = new Date(today); expiry90.setDate(today.getDate() + 90);
  const expiringMedicines = medicines.filter(m => m.expiryDate && new Date(m.expiryDate) <= expiry90).map(m => ({
    name: m.name, batch: m.batchNo, expiry: new Date(m.expiryDate).toISOString(), stock: m.stockQty, status: new Date(m.expiryDate) < today ? "expired" : "expiring",
  }));

  const lowStockMedicines = medicines.filter(m => m.stockQty <= m.reorderLevel).map(m => ({
    name: m.name, stock: m.stockQty, reorder: m.reorderLevel,
  }));

  const monthlyPhSales: { month: string; sales: number; purchases: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    const ms = new Date(customStart); const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const sales = pharmacySales.filter(ps => { const dt = new Date(ps.saleDate); return dt >= cm && dt < dn; }).reduce((s, ps) => s + ps.total, 0);
      const purchases = purchaseOrders.filter(po => { const dt = new Date(po.orderDate); return dt >= cm && dt < dn; }).reduce((s, po) => s + po.totalAmount, 0);
      monthlyPhSales.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), sales, purchases });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const sales = pharmacySales.filter(ps => { const dt = new Date(ps.saleDate); return dt >= d && dt < dn; }).reduce((s, ps) => s + ps.total, 0);
      const purchases = purchaseOrders.filter(po => { const dt = new Date(po.orderDate); return dt >= d && dt < dn; }).reduce((s, po) => s + po.totalAmount, 0);
      monthlyPhSales.push({ month: d.toLocaleDateString("en-US", { month: "short" }), sales, purchases });
    }
  }

  // ============ Laboratory ============
  const labOrders = await db.labOrder.findMany({ include: { items: { include: { test: true } } }, orderBy: { orderedAt: "desc" } });

  const labOrdersTotal = labOrders.reduce((s, o) => s + o.totalAmount, 0);
  const labOrdersPaid = labOrders.reduce((s, o) => s + o.paidAmount, 0);
  const labPendingOrders = labOrders.filter(o => o.status === "ordered" || o.status === "collected").length;
  const labCompletedOrders = labOrders.filter(o => o.status === "completed").length;
  const labInProgressOrders = labOrders.filter(o => o.status === "processing").length;

  const labByStatus: Record<string, number> = {};
  labOrders.forEach(o => { labByStatus[o.status] = (labByStatus[o.status] || 0) + 1; });

  const testCounts: Record<string, number> = {};
  labOrders.forEach(o => { (o.items as any[]).forEach(item => { const testName = item.test?.name || "Unknown"; testCounts[testName] = (testCounts[testName] || 0) + 1; }); });
  const labTestsPopularity = Object.entries(testCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const monthlyLabRevenue: { month: string; orders: number; revenue: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    const ms = new Date(customStart); const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const monthOrders = labOrders.filter(o => { const dt = new Date(o.orderedAt); return dt >= cm && dt < dn; });
      monthlyLabRevenue.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), orders: monthOrders.length, revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0) });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const monthOrders = labOrders.filter(o => { const dt = new Date(o.orderedAt); return dt >= d && dt < dn; });
      monthlyLabRevenue.push({ month: d.toLocaleDateString("en-US", { month: "short" }), orders: monthOrders.length, revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0) });
    }
  }

  // ============ Staff ============
  const staff = await db.staff.findMany({ where: branchFilter, include: { attendance: { where: { date: { gte: startDate } } } } });
  const staffAttendance: { name: string; present: number; absent: number; leave: number }[] = [];
  staff.slice(0, 10).forEach(s => {
    staffAttendance.push({ name: s.name, present: s.attendance.filter(a => a.status === "present").length, absent: s.attendance.filter(a => a.status === "absent").length, leave: s.attendance.filter(a => a.status === "leave").length });
  });
  const staffByDept: Record<string, number> = {};
  staff.forEach(s => { staffByDept[s.department || "Unassigned"] = (staffByDept[s.department || "Unassigned"] || 0) + 1; });

  // ============ Invoice List ============
  const invoiceList = allInvoices.map(i => ({
    id: i.id, invoiceNo: i.invoiceNo, patientName: (i as any).patient?.name || "",
    type: i.type, total: i.total, paid: i.paid, due: i.due,
    date: i.date.toISOString(), status: i.status, paymentMethod: i.paymentMethod || "",
  }));

  res.json({
    totalRevenue, totalCollection, totalDue, revenueByType, revenueByPayment,
    doctorPerf, monthlyRevenue, dailyRevenue,
    patientCount: patients.length, appointmentCount: appointments.length,
    expensesTotal, netProfit: totalRevenue - expensesTotal,
    expenses: expenses.slice(0, 50), expenseByCategory,
    newPatientsMonth, patientByMonth,
    confirmedAppts, cancelledAppts, pendingAppts, noShowAppts,
    apptByDoctor, apptByDay, apptByHour,
    invoicesByType, paymentsByMethod, outstanding: outstanding.length,
    outstanding0_30, outstanding31_60, outstanding60plus, invoiceList,
    phSalesTotal, phSalesCollection, phPurchasesTotal, phStockValue,
    expiringMedicines, lowStockMedicines, monthlyPhSales,
    labOrdersTotal, labOrdersPaid, labOrdersDue: labOrdersTotal - labOrdersPaid,
    labPendingOrders, labCompletedOrders, labInProgressOrders,
    labByStatus, labTestsPopularity, monthlyLabRevenue,
    totalLabOrders: labOrders.length, totalLabTests: (await db.labTestMaster.count()),
    totalStaff: staff.length, activeStaff: staff.filter(s => s.status === "active").length,
    staffAttendance, staffByDept,
  });
}

// ─── /api/doctor-dashboard ───────────────────────────────────────

async function getDoctorDashboard(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const branchFilter = branchId ? { branchId } : {};
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [doctors, departments, branches, todayAppts, todayInvoices] = await Promise.all([
    db.doctor.findMany({ where: branchFilter, include: { department: true, appointments: { where: { date: { gte: startOfDay, lt: endOfDay } } } } }),
    db.department.findMany({ where: branchFilter }),
    db.branch.findMany(),
    db.appointment.findMany({ where: { ...branchFilter, date: { gte: startOfDay, lt: endOfDay } } }),
    db.invoice.findMany({ where: { ...branchFilter, date: { gte: startOfDay, lt: endOfDay } } }),
  ]);

  const totalDoctors = doctors.length;
  const activeNow = doctors.filter(d => d.status === "active").length;
  const inConsultation = todayAppts.filter(a => a.status === "in-consult").length;
  const todayPatients = todayAppts.length;
  const todayRevenue = todayInvoices.reduce((s, i) => s + i.paid, 0);

  // Department-wise doctor count
  const deptStats = departments.map(d => ({
    name: d.name,
    color: d.color,
    count: doctors.filter(doc => doc.departmentId === d.id).length,
  })).filter(d => d.count > 0);

  // Doctor performance (top 8 by appointment count this month)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const doctorsWithAppts = await Promise.all(
    doctors.map(async d => {
      const monthAppts = await db.appointment.count({ where: { doctorId: d.id, date: { gte: startOfMonth } } });
      const completedAppts = await db.appointment.count({ where: { doctorId: d.id, date: { gte: startOfMonth }, status: "completed" } });
      return {
        id: d.id, name: d.name, specialization: d.specialization, rating: d.rating,
        department: d.department.name, departmentColor: d.department.color,
        consultationFee: d.consultationFee, status: d.status,
        monthAppts, completedAppts,
        revenue: monthAppts * d.consultationFee,
      };
    })
  );
  const topPerformers = doctorsWithAppts.sort((a, b) => b.monthAppts - a.monthAppts).slice(0, 8);

  // Status distribution
  const statusDist: Record<string, number> = {};
  doctors.forEach(d => { statusDist[d.status] = (statusDist[d.status] || 0) + 1; });

  // Available now (active + has working days including today)
  const dayName = today.toLocaleDateString("en-US", { weekday: "short" });
  const availableNow = doctors.filter(d => d.status === "active" && d.workingDays.includes(dayName)).length;

  res.json({
    kpis: {
      totalDoctors,
      activeNow,
      availableNow,
      inConsultation,
      todayPatients,
      todayRevenue,
      departments: departments.length,
      branches: branches.length,
    },
    deptStats,
    topPerformers,
    statusDist,
  });
}

// ─── Routers ─────────────────────────────────────────────────────

export function radiologyRouter(): Router {
  const r = Router();
  r.get("/", wrap(listRadiologyTests));
  r.post("/", wrap(createRadiologyTest));
  r.patch("/:id", wrap(updateRadiologyTest));
  r.delete("/:id", wrap(deleteRadiologyTest));
  return r;
}

export function radiologyAlertsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listRadiologyAlerts));
  r.patch("/:id", wrap(updateRadiologyAlert));
  return r;
}

export function radiologyDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(getRadiologyDashboard));
  return r;
}

export function radiologyEquipmentRouter(): Router {
  const r = Router();
  r.get("/", wrap(listRadiologyEquipment));
  r.post("/", wrap(createRadiologyEquipment));
  return r;
}

export function radiologyModalitiesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listRadiologyModalities));
  r.post("/", wrap(createRadiologyModality));
  return r;
}

export function radiologySchedulesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listRadiologySchedules));
  r.post("/", wrap(createRadiologySchedule));
  return r;
}

export function radiologyStudiesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listRadiologyStudies));
  r.post("/", wrap(createRadiologyStudy));
  r.patch("/:id", wrap(updateRadiologyStudy));
  r.delete("/:id", wrap(deleteRadiologyStudy));
  return r;
}

export function reportsRouter(): Router {
  const r = Router();
  r.get("/", wrap(getReports));
  r.get("/all", wrap(getAllReports));
  return r;
}

export function doctorDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(getDoctorDashboard));
  return r;
}
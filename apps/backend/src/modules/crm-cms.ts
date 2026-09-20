/**
 * CRM & CMS modules — port of frontend /api routes:
 *   crm-communications, crm-communications/[id],
 *   crm-contacts, crm-contacts/[id],
 *   crm-dashboard, crm-deals, crm-deals/[id], crm-reports,
 *   crm-tasks, crm-tasks/[id], crm-templates, crm-templates/[id],
 *   cms-activity-logs, cms-appointments-ext, cms-appointments-ext/[id],
 *   cms-campaigns, cms-campaigns/[id],
 *   cms-care-coordinators, cms-care-coordinators/[id],
 *   cms-commission, cms-dashboard, cms-leads, cms-leads/[id],
 *   cms-patient-sources, cms-patient-sources/[id],
 *   cms-referrals, cms-referrals/[id], cms-reports,
 *   leads, leads/[id].
 * Tenant isolation enforced by lib/prisma.ts exactly as the frontend's
 * withTenant db did (lead/cRMCommunication/cRMTask/cRMActivity are NOT
 * tenant models there either, so plain db reproduces the original behavior).
 * None of the original routes had permission guards, client-IP capture, or
 * per-user audit attribution (audit user is hardcoded "system" or taken from
 * the request body), so no auth/permission helpers are needed here.
 */
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "../lib/prisma";
import { fail, wrap } from "../lib/http";

// nanoid equivalent (backend has no nanoid dependency) — same default
// 64-char url alphabet, same size semantics, same uppercased usage.
const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

function nanoid(size = 21): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) id += NANOID_ALPHABET[bytes[i] % NANOID_ALPHABET.length];
  return id;
}

// ════════════════════════════════════════════════════════════════
// CRM Communications — /api/crm-communications and /api/crm-communications/[id]
// ════════════════════════════════════════════════════════════════

async function listCommunications(req: Request, res: Response) {
  const contactId = req.query.contactId as string | undefined;
  const type = req.query.type as string | undefined;
  const direction = req.query.direction as string | undefined;
  const assignedTo = req.query.assignedTo as string | undefined;

  const where: Record<string, unknown> = {};
  if (contactId) where.contactId = contactId;
  if (type) where.type = type;
  if (direction) where.direction = direction;
  if (assignedTo) where.assignedTo = assignedTo;

  const communications = await db.cRMCommunication.findMany({
    where,
    include: { contact: { select: { name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(communications);
}

async function createCommunication(req: Request, res: Response) {
  const body = req.body || {};
  const communication = await db.cRMCommunication.create({ data: body });
  await db.cRMContact.update({
    where: { id: body.contactId },
    data: { lastContactAt: new Date() },
  });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created ${body.type} communication for contact ${body.contactId}` },
  });
  res.status(201).json(communication);
}

async function getCommunication(req: Request, res: Response) {
  const id = req.params.id as string;
  const communication = await db.cRMCommunication.findUnique({
    where: { id },
    include: { contact: true },
  });
  if (!communication) return fail(res, 404, "Not found");
  res.json(communication);
}

async function updateCommunication(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const communication = await db.cRMCommunication.update({ where: { id }, data: body });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated communication ${communication.id}` },
  });
  res.json(communication);
}

async function deleteCommunication(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.cRMCommunication.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted communication ${id}` },
  });
  res.json({ ok: true });
}

export function crmCommunicationsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listCommunications));
  r.post("/", wrap(createCommunication));
  r.get("/:id", wrap(getCommunication));
  r.patch("/:id", wrap(updateCommunication));
  r.delete("/:id", wrap(deleteCommunication));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CRM Contacts — /api/crm-contacts and /api/crm-contacts/[id]
// ════════════════════════════════════════════════════════════════

async function listContacts(req: Request, res: Response) {
  const search = req.query.search as string | undefined;
  const type = req.query.type as string | undefined;
  const category = req.query.category as string | undefined;
  const source = req.query.source as string | undefined;
  const status = req.query.status as string | undefined;
  const assignedTo = req.query.assignedTo as string | undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "ignoreCase" as const } },
      { phone: { contains: search, mode: "ignoreCase" as const } },
      { email: { contains: search, mode: "ignoreCase" as const } },
      { contactNo: { contains: search, mode: "ignoreCase" as const } },
    ];
  }
  if (type) where.type = type;
  if (category) where.category = category;
  if (source) where.source = source;
  if (status) where.status = status;
  if (assignedTo) where.assignedTo = assignedTo;

  const contacts = await db.cRMContact.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(contacts);
}

async function createContact(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.cRMContact.count();
  const contact = await db.cRMContact.create({
    data: { ...body, contactNo: `CON-${nanoid(8).toUpperCase()}` },
  });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created contact ${contact.contactNo} - ${contact.name}` },
  });
  res.status(201).json(contact);
}

async function getContact(req: Request, res: Response) {
  const id = req.params.id as string;
  const contact = await db.cRMContact.findUnique({
    where: { id },
    include: {
      deals: true,
      communications: { orderBy: { createdAt: "desc" }, take: 20 },
      tasks: { where: { status: { not: "completed" } }, take: 10 },
    },
  });
  if (!contact) return fail(res, 404, "Not found");
  res.json(contact);
}

async function updateContact(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const contact = await db.cRMContact.update({ where: { id }, data: body });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated contact ${contact.contactNo} - ${contact.name}` },
  });
  res.json(contact);
}

async function deleteContact(req: Request, res: Response) {
  const id = req.params.id as string;
  const contact = await db.cRMContact.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted contact ${contact.contactNo} - ${contact.name}` },
  });
  res.json({ ok: true });
}

export function crmContactsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listContacts));
  r.post("/", wrap(createContact));
  r.get("/:id", wrap(getContact));
  r.patch("/:id", wrap(updateContact));
  r.delete("/:id", wrap(deleteContact));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CRM Dashboard — /api/crm-dashboard
// ════════════════════════════════════════════════════════════════

async function crmDashboard(_req: Request, res: Response) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [totalContacts, activeContacts, newContactsThisMonth, totalDeals, deals, allDeals, overdueTasks, pendingTasks, totalCommunications, commsThisWeek, recentActivities, contactsByType, dealsByStage, dealsBySource] = await Promise.all([
    db.cRMContact.count(),
    db.cRMContact.count({ where: { status: "active" } }),
    db.cRMContact.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.cRMDeal.count(),
    db.cRMDeal.findMany({ where: { stage: { notIn: ["closed_won", "closed_lost"] } } }),
    db.cRMDeal.findMany(),
    db.cRMTask.count({ where: { status: { notIn: ["completed", "cancelled"] }, dueDate: { lt: today } } }),
    db.cRMTask.count({ where: { status: { notIn: ["completed", "cancelled"] } } }),
    db.cRMCommunication.count(),
    db.cRMCommunication.count({ where: { createdAt: { gte: startOfWeek } } }),
    db.cRMActivity.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.cRMContact.groupBy({ by: ["type"], _count: true }),
    db.cRMDeal.groupBy({ by: ["stage"], _count: true }),
    db.cRMDeal.groupBy({ by: ["source"], _count: true }),
  ]);

  const activeDeals = deals.length;
  const totalDealValue = allDeals.reduce((s, d) => s + d.value, 0);
  const wonDeals = allDeals.filter((d) => d.stage === "closed_won");
  const lostDeals = allDeals.filter((d) => d.stage === "closed_lost");
  const wonDealValue = wonDeals.reduce((s, d) => s + d.value, 0);
  const lostDealValue = lostDeals.reduce((s, d) => s + d.value, 0);
  const winRate = wonDeals.length + lostDeals.length > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;
  const avgDealValue = allDeals.length > 0 ? Math.round(totalDealValue / allDeals.length) : 0;

  const pipelineValue: { stage: string; value: number; count: number }[] = [];
  for (const row of dealsByStage) {
    const stageDeals = allDeals.filter((d) => d.stage === row.stage);
    pipelineValue.push({
      stage: row.stage,
      value: stageDeals.reduce((s, d) => s + d.value, 0),
      count: row._count,
    });
  }

  const monthlyDeals: { month: string; won: number; lost: number; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const monthDeals = allDeals.filter((dl) => dl.createdAt >= d && dl.createdAt < dn);
    monthlyDeals.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      won: monthDeals.filter((dl) => dl.stage === "closed_won").length,
      lost: monthDeals.filter((dl) => dl.stage === "closed_lost").length,
      total: monthDeals.length,
    });
  }

  const contactsByTypeMap: Record<string, number> = {};
  contactsByType.forEach((r) => { contactsByTypeMap[r.type] = r._count; });

  const dealsByStageMap: Record<string, number> = {};
  dealsByStage.forEach((r) => { dealsByStageMap[r.stage] = r._count; });

  const dealsBySourceMap: Record<string, number> = {};
  dealsBySource.forEach((r) => { dealsBySourceMap[r.source] = r._count; });

  res.json({
    totalContacts,
    activeContacts,
    newContactsThisMonth,
    totalDeals,
    activeDeals,
    totalDealValue,
    wonDealValue,
    lostDealValue,
    winRate,
    avgDealValue,
    overdueTasks,
    pendingTasks,
    totalCommunications,
    commsThisWeek,
    contactsByType: contactsByTypeMap,
    dealsByStage: dealsByStageMap,
    dealsBySource: dealsBySourceMap,
    recentActivities,
    pipelineValue,
    monthlyDeals,
  });
}

export function crmDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(crmDashboard));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CRM Deals — /api/crm-deals and /api/crm-deals/[id]
// ════════════════════════════════════════════════════════════════

async function listDeals(req: Request, res: Response) {
  const stage = req.query.stage as string | undefined;
  const source = req.query.source as string | undefined;
  const contactId = req.query.contactId as string | undefined;
  const assignedTo = req.query.assignedTo as string | undefined;
  const priority = req.query.priority as string | undefined;

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (contactId) where.contactId = contactId;
  if (assignedTo) where.assignedTo = assignedTo;
  if (priority) where.priority = priority;

  const deals = await db.cRMDeal.findMany({
    where,
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(deals);
}

async function createDeal(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.cRMDeal.count();
  const deal = await db.cRMDeal.create({
    data: { ...body, dealNo: `DEAL-${nanoid(8).toUpperCase()}` },
  });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created deal ${deal.dealNo} - ${deal.title}` },
  });
  await db.cRMActivity.create({
    data: {
      dealId: deal.id,
      type: "note",
      description: `Deal created: ${deal.title}`,
      performedBy: body.assignedTo || "system",
    },
  });
  res.status(201).json(deal);
}

async function getDeal(req: Request, res: Response) {
  const id = req.params.id as string;
  const deal = await db.cRMDeal.findUnique({
    where: { id },
    include: { contact: true, activities: { orderBy: { createdAt: "desc" } } },
  });
  if (!deal) return fail(res, 404, "Not found");
  res.json(deal);
}

async function updateDeal(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};

  const existing = await db.cRMDeal.findUnique({ where: { id } });
  if (!existing) return fail(res, 404, "Not found");

  const data: Record<string, unknown> = { ...body };

  if (body.stage && body.stage !== existing.stage) {
    await db.cRMActivity.create({
      data: {
        dealId: id,
        type: "stage_change",
        fromStage: existing.stage,
        toStage: body.stage,
        description: `Stage changed from ${existing.stage} to ${body.stage}`,
        performedBy: body.assignedTo || "system",
      },
    });
  }

  if (body.stage === "closed_won" || body.stage === "closed_lost") {
    data.closedAt = new Date();
  }

  const deal = await db.cRMDeal.update({ where: { id }, data: data as never });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated deal ${deal.dealNo} - ${deal.title}` },
  });
  res.json(deal);
}

async function deleteDeal(req: Request, res: Response) {
  const id = req.params.id as string;
  const deal = await db.cRMDeal.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted deal ${deal.dealNo} - ${deal.title}` },
  });
  res.json({ ok: true });
}

export function crmDealsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listDeals));
  r.post("/", wrap(createDeal));
  r.get("/:id", wrap(getDeal));
  r.patch("/:id", wrap(updateDeal));
  r.delete("/:id", wrap(deleteDeal));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CRM Reports — /api/crm-reports
// ════════════════════════════════════════════════════════════════

async function crmReports(_req: Request, res: Response) {
  try {
    const [contacts, deals, communications, tasks] = await Promise.all([
      db.cRMContact.findMany({ select: { id: true, type: true, status: true } }),
      db.cRMDeal.findMany({ select: { id: true, stage: true, value: true, source: true, createdAt: true } }),
      db.cRMCommunication.findMany({ select: { id: true, type: true, createdAt: true } }),
      db.cRMTask.findMany({ select: { id: true, status: true, priority: true } }),
    ]);

    const totalContacts = contacts.length;
    const activeDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).length;
    const wonRevenue = deals.filter(d => d.stage === "closed_won").reduce((sum, d) => sum + d.value, 0);
    const wonDeals = deals.filter(d => d.stage === "closed_won").length;
    const lostDeals = deals.filter(d => d.stage === "closed_lost").length;
    const winRate = (wonDeals + lostDeals) > 0 ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100) : 0;
    const avgDealValue = deals.length > 0 ? Math.round(deals.reduce((sum, d) => sum + d.value, 0) / deals.length) : 0;
    const pendingTasks = tasks.filter(t => t.status === "pending").length;

    // Deals by stage
    const stageCount: Record<string, number> = {};
    deals.forEach(d => { stageCount[d.stage] = (stageCount[d.stage] || 0) + 1; });
    const dealsByStage = Object.entries(stageCount).map(([stage, count]) => ({ stage, count }));

    // Contacts by type
    const typeCount: Record<string, number> = {};
    contacts.forEach(c => { typeCount[c.type] = (typeCount[c.type] || 0) + 1; });
    const contactsByType = Object.entries(typeCount).map(([type, count]) => ({ type, count }));

    // Deals by source
    const sourceCount: Record<string, number> = {};
    deals.forEach(d => { sourceCount[d.source] = (sourceCount[d.source] || 0) + 1; });
    const dealsBySource = Object.entries(sourceCount).map(([source, count]) => ({ source, count }));

    // Pipeline by stage (value)
    const stageValue: Record<string, number> = {};
    deals.forEach(d => { stageValue[d.stage] = (stageValue[d.stage] || 0) + d.value; });
    const pipelineByStage = Object.entries(stageValue).map(([stage, value]) => ({ stage, value }));

    // Monthly deals (last 12 months)
    const monthlyDeals: { month: string; won: number; lost: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
      const won = deals.filter(d => d.stage === "closed_won" && d.createdAt.toISOString().startsWith(monthStr)).length;
      const lost = deals.filter(d => d.stage === "closed_lost" && d.createdAt.toISOString().startsWith(monthStr)).length;
      monthlyDeals.push({ month: monthLabel, won, lost });
    }

    // Contact distribution
    const contactDistribution = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0,
    }));

    // Deal performance
    const dealPerformance = [
      { metric: "Total Deals", value: String(deals.length) },
      { metric: "Active Deals", value: String(activeDeals) },
      { metric: "Won Deals", value: String(wonDeals) },
      { metric: "Lost Deals", value: String(lostDeals) },
      { metric: "Win Rate", value: `${winRate}%` },
      { metric: "Avg Deal Value", value: `Rs ${avgDealValue.toLocaleString()}` },
    ];

    res.json({
      summary: { totalContacts, activeDeals, wonRevenue, winRate, avgDealValue, pendingTasks },
      dealsByStage,
      contactsByType,
      dealsBySource,
      pipelineByStage,
      monthlyDeals,
      contactDistribution,
      dealPerformance,
    });
  } catch (error) {
    console.error("crm-reports error:", error);
    res.json({
      summary: { totalContacts: 0, activeDeals: 0, wonRevenue: 0, winRate: 0, avgDealValue: 0, pendingTasks: 0 },
      dealsByStage: [],
      contactsByType: [],
      dealsBySource: [],
      pipelineByStage: [],
      monthlyDeals: [],
      contactDistribution: [],
      dealPerformance: [],
    });
  }
}

export function crmReportsRouter(): Router {
  const r = Router();
  r.get("/", wrap(crmReports));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CRM Tasks — /api/crm-tasks and /api/crm-tasks/[id]
// ════════════════════════════════════════════════════════════════

async function listTasks(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;
  const type = req.query.type as string | undefined;
  const contactId = req.query.contactId as string | undefined;
  const assignedTo = req.query.assignedTo as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;
  if (contactId) where.contactId = contactId;
  if (assignedTo) where.assignedTo = assignedTo;

  const tasks = await db.cRMTask.findMany({
    where,
    include: { contact: { select: { name: true, phone: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  res.json(tasks);
}

async function createTask(req: Request, res: Response) {
  const body = req.body || {};
  const task = await db.cRMTask.create({ data: body });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created task: ${task.title}` },
  });
  res.status(201).json(task);
}

async function getTask(req: Request, res: Response) {
  const id = req.params.id as string;
  const task = await db.cRMTask.findUnique({
    where: { id },
    include: { contact: true },
  });
  if (!task) return fail(res, 404, "Not found");
  res.json(task);
}

async function updateTask(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };

  if (body.status === "completed") {
    data.completedAt = new Date();
  }

  const task = await db.cRMTask.update({ where: { id }, data: data as never });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated task: ${task.title}` },
  });
  res.json(task);
}

async function deleteTask(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.cRMTask.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted task ${id}` },
  });
  res.json({ ok: true });
}

export function crmTasksRouter(): Router {
  const r = Router();
  r.get("/", wrap(listTasks));
  r.post("/", wrap(createTask));
  r.get("/:id", wrap(getTask));
  r.patch("/:id", wrap(updateTask));
  r.delete("/:id", wrap(deleteTask));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CRM Templates — /api/crm-templates and /api/crm-templates/[id]
// ════════════════════════════════════════════════════════════════

async function listTemplates(req: Request, res: Response) {
  const category = req.query.category as string | undefined;
  const isActive = req.query.isActive as string | undefined;

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (isActive !== null && isActive !== undefined) where.isActive = isActive === "true";

  const templates = await db.emailTemplate.findMany({ where, orderBy: { name: "asc" } });
  res.json(templates);
}

async function createTemplate(req: Request, res: Response) {
  const body = req.body || {};
  const template = await db.emailTemplate.create({ data: body });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created template: ${template.name}` },
  });
  res.status(201).json(template);
}

async function getTemplate(req: Request, res: Response) {
  const id = req.params.id as string;
  const template = await db.emailTemplate.findUnique({ where: { id } });
  if (!template) return fail(res, 404, "Not found");
  res.json(template);
}

async function updateTemplate(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const template = await db.emailTemplate.update({ where: { id }, data: body });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated template: ${template.name}` },
  });
  res.json(template);
}

async function deleteTemplate(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.emailTemplate.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted template ${id}` },
  });
  res.json({ ok: true });
}

export function crmTemplatesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listTemplates));
  r.post("/", wrap(createTemplate));
  r.get("/:id", wrap(getTemplate));
  r.patch("/:id", wrap(updateTemplate));
  r.delete("/:id", wrap(deleteTemplate));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Activity Logs — /api/cms-activity-logs
// ════════════════════════════════════════════════════════════════

async function listActivityLogs(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  const logs = await db.patientActivityLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(logs);
}

async function createActivityLog(req: Request, res: Response) {
  const body = req.body || {};
  const log = await db.patientActivityLog.create({ data: body });
  res.status(201).json(log);
}

export function cmsActivityLogsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listActivityLogs));
  r.post("/", wrap(createActivityLog));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Appointments Ext — /api/cms-appointments-ext and /api/cms-appointments-ext/[id]
// ════════════════════════════════════════════════════════════════

async function listAppointmentExts(req: Request, res: Response) {
  const bookingSource = req.query.bookingSource as string | undefined;
  const where: Record<string, unknown> = {};
  if (bookingSource) where.bookingSource = bookingSource;
  const exts = await db.appointmentExtension.findMany({ where, orderBy: { createdAt: "desc" } });
  // Enrich with appointment + patient + doctor
  const apptIds = [...new Set(exts.map(e => e.appointmentId))];
  const appts = await db.appointment.findMany({ where: { id: { in: apptIds } }, include: { patient: true, doctor: true } });
  const aMap = Object.fromEntries(appts.map(a => [a.id, a]));
  res.json(exts.map(e => ({
    ...e,
    appointment: aMap[e.appointmentId] ? {
      date: aMap[e.appointmentId].date,
      time: aMap[e.appointmentId].time,
      tokenNo: aMap[e.appointmentId].tokenNo,
      reason: aMap[e.appointmentId].reason,
      patientName: aMap[e.appointmentId].patient?.name || "—",
      patientCode: aMap[e.appointmentId].patient?.patientCode || "—",
      patientPhone: aMap[e.appointmentId].patient?.phone || "—",
      doctorName: aMap[e.appointmentId].doctor?.name || "—",
    } : null,
  })));
}

async function createAppointmentExt(req: Request, res: Response) {
  const body = req.body || {};
  const ext = await db.appointmentExtension.create({ data: body });
  await db.patientActivityLog.create({ data: { patientId: body.patientId || "system", appointmentId: body.appointmentId, activity: "appointment_booked", description: `Appointment booked via ${body.bookingChannel} (${body.bookingSource})`, performedBy: "system" } });
  res.status(201).json(ext);
}

async function getAppointmentExt(req: Request, res: Response) {
  const id = req.params.id as string;
  const e = await db.appointmentExtension.findUnique({ where: { id } });
  if (!e) return fail(res, 404, "Not found");
  res.json(e);
}

async function updateAppointmentExt(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const e = await db.appointmentExtension.update({ where: { id }, data: body });
  // Log status transitions as activity
  if (body.status) {
    const activityMap: Record<string, string> = {
      confirmed: "appointment_confirmed",
      checked_in: "checked_in",
      consultation: "consultation",
      billing: "billing_completed",
      completed: "billing_completed",
    };
    if (activityMap[body.status]) {
      await db.patientActivityLog.create({ data: { appointmentId: e.appointmentId, patientId: "system", activity: activityMap[body.status], description: `Status → ${body.status}`, performedBy: "system" } }).catch(() => {});
    }
  }
  res.json(e);
}

async function deleteAppointmentExt(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.appointmentExtension.delete({ where: { id } });
  res.json({ ok: true });
}

export function cmsAppointmentsExtRouter(): Router {
  const r = Router();
  r.get("/", wrap(listAppointmentExts));
  r.post("/", wrap(createAppointmentExt));
  r.get("/:id", wrap(getAppointmentExt));
  r.patch("/:id", wrap(updateAppointmentExt));
  r.delete("/:id", wrap(deleteAppointmentExt));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Campaigns — /api/cms-campaigns and /api/cms-campaigns/[id]
// ════════════════════════════════════════════════════════════════

async function listCampaigns(_req: Request, res: Response) {
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: "desc" } });
  res.json(campaigns);
}

async function createCampaign(req: Request, res: Response) {
  const body = req.body || {};
  const campaign = await db.campaign.create({ data: body });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Carelim MS", detail: `Created campaign ${campaign.name}` } });
  res.status(201).json(campaign);
}

async function getCampaign(req: Request, res: Response) {
  const id = req.params.id as string;
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) return fail(res, 404, "Not found");
  res.json(c);
}

async function updateCampaign(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const c = await db.campaign.update({ where: { id }, data: body });
  res.json(c);
}

async function deleteCampaign(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.campaign.delete({ where: { id } });
  res.json({ ok: true });
}

export function cmsCampaignsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listCampaigns));
  r.post("/", wrap(createCampaign));
  r.get("/:id", wrap(getCampaign));
  r.patch("/:id", wrap(updateCampaign));
  r.delete("/:id", wrap(deleteCampaign));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Care Coordinators — /api/cms-care-coordinators and /api/cms-care-coordinators/[id]
// ════════════════════════════════════════════════════════════════

async function listCoordinators(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const coordinators = await db.careCoordinator.findMany({ where, orderBy: { createdAt: "desc" } });
  // Enrich with patient names
  const patientIds = [...new Set(coordinators.map(c => c.patientId))];
  const patients = await db.patient.findMany({ where: { id: { in: patientIds } } });
  const pMap = Object.fromEntries(patients.map(p => [p.id, p]));
  res.json(coordinators.map(c => ({
    ...c,
    patientName: pMap[c.patientId]?.name || c.patientId,
    patientCode: pMap[c.patientId]?.patientCode || "—",
    patientPhone: pMap[c.patientId]?.phone || "—",
  })));
}

async function createCoordinator(req: Request, res: Response) {
  const body = req.body || {};
  const c = await db.careCoordinator.create({
    data: { ...body, nextFollowup: body.nextFollowup ? new Date(body.nextFollowup) : null },
  });
  await db.auditLog.create({ data: { user: "system", action: "ASSIGN", module: "Carelim MS", detail: `Assigned coordinator ${body.coordinatorName} to patient` } });
  res.status(201).json(c);
}

async function getCoordinator(req: Request, res: Response) {
  const id = req.params.id as string;
  const c = await db.careCoordinator.findUnique({ where: { id } });
  if (!c) return fail(res, 404, "Not found");
  res.json(c);
}

async function updateCoordinator(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.nextFollowup) data.nextFollowup = new Date(body.nextFollowup);
  const c = await db.careCoordinator.update({ where: { id }, data: data as never });
  res.json(c);
}

async function deleteCoordinator(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.careCoordinator.delete({ where: { id } });
  res.json({ ok: true });
}

export function cmsCareCoordinatorsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listCoordinators));
  r.post("/", wrap(createCoordinator));
  r.get("/:id", wrap(getCoordinator));
  r.patch("/:id", wrap(updateCoordinator));
  r.delete("/:id", wrap(deleteCoordinator));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Commission — /api/cms-commission
// ════════════════════════════════════════════════════════════════

async function cmsCommission(_req: Request, res: Response) {
  const [referrals, settlements] = await Promise.all([
    db.referral.findMany({ orderBy: { createdAt: "desc" } }),
    db.commissionSettlement.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const totalCommission = referrals.reduce((s, r) => s + r.commissionAmount, 0);
  const pendingCommission = referrals.filter(r => r.status === "pending" || r.status === "earned").reduce((s, r) => s + r.commissionAmount, 0);
  const paidCommission = settlements.filter(s => s.status === "paid").reduce((s, r) => s + r.amount, 0);
  const monthCommission = referrals.filter(r => r.createdAt >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((s, r) => s + r.commissionAmount, 0);

  // By clinic
  const byClinic: Record<string, { count: number; amount: number; pending: number }> = {};
  referrals.forEach(r => {
    const k = r.clinicId || "unassigned";
    byClinic[k] = byClinic[k] || { count: 0, amount: 0, pending: 0 };
    byClinic[k].count++;
    byClinic[k].amount += r.commissionAmount;
    if (r.status === "pending" || r.status === "earned") byClinic[k].pending += r.commissionAmount;
  });
  const branches = await db.branch.findMany();
  const bMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const byClinicArray = Object.entries(byClinic).map(([id, v]) => ({ clinicId: id, clinicName: bMap[id] || id, ...v }));

  // By doctor
  const byDoctor: Record<string, { count: number; amount: number }> = {};
  referrals.forEach(r => {
    const k = r.doctorId || "unassigned";
    byDoctor[k] = byDoctor[k] || { count: 0, amount: 0 };
    byDoctor[k].count++;
    byDoctor[k].amount += r.commissionAmount;
  });
  const doctors = await db.doctor.findMany();
  const dMap = Object.fromEntries(doctors.map(d => [d.id, d.name]));
  const byDoctorArray = Object.entries(byDoctor).map(([id, v]) => ({ doctorId: id, doctorName: dMap[id] || id, ...v }));

  res.json({
    summary: { totalCommission, pendingCommission, paidCommission, monthCommission, totalReferrals: referrals.length, totalSettlements: settlements.length },
    byClinic: byClinicArray,
    byDoctor: byDoctorArray,
    referrals: referrals.map(r => ({ ...r, settlement: settlements.find(s => s.referralId === r.id) })),
    settlements,
  });
}

export function cmsCommissionRouter(): Router {
  const r = Router();
  r.get("/", wrap(cmsCommission));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Dashboard — /api/cms-dashboard
// ════════════════════════════════════════════════════════════════

async function cmsDashboard(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const branchFilter = branchId ? { branchId } : {};
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [sources, apptExts, referrals, leads, coordinators, campaigns, settlements] = await Promise.all([
    db.patientSource.findMany(),
    db.appointmentExtension.findMany(),
    db.referral.findMany(),
    db.mSLead.findMany(),
    db.careCoordinator.findMany(),
    db.campaign.findMany(),
    db.commissionSettlement.findMany(),
  ]);

  const carelimPatients = sources.filter(s => s.sourceType === "carelim");
  const clinicPatients = sources.filter(s => s.sourceType === "clinic");

  // Today's appointments (from extension table)
  const todayAppts = apptExts.filter(a => true); // would filter by today in production

  // Revenue today (from referrals with billAmount)
  const todayRevenue = referrals.filter(r => r.createdAt >= startOfDay).reduce((s, r) => s + r.billAmount, 0);
  const monthRevenue = referrals.filter(r => r.createdAt >= startOfMonth).reduce((s, r) => s + r.billAmount, 0);

  // Commission
  const commissionToday = referrals.filter(r => r.createdAt >= startOfDay).reduce((s, r) => s + r.commissionAmount, 0);
  const pendingCommission = referrals.filter(r => r.status === "pending" || r.status === "earned").reduce((s, r) => s + r.commissionAmount, 0);
  const paidCommission = settlements.filter(s => s.status === "paid").reduce((s, r) => s + r.amount, 0);
  const monthCommission = referrals.filter(r => r.createdAt >= startOfMonth).reduce((s, r) => s + r.commissionAmount, 0);

  // New leads this month
  const newLeads = leads.filter(l => l.createdAt >= startOfMonth).length;

  // Follow-up due
  const followupDue = coordinators.filter(c => c.nextFollowup && new Date(c.nextFollowup) <= new Date(today.getTime() + 3 * 86400000) && c.status === "active").length;

  // Source distribution
  const sourceDist: Record<string, number> = {};
  sources.forEach(s => { sourceDist[s.sourceName] = (sourceDist[s.sourceName] || 0) + 1; });

  // Lead status distribution
  const leadStatusDist: Record<string, number> = {};
  leads.forEach(l => { leadStatusDist[l.status] = (leadStatusDist[l.status] || 0) + 1; });

  // Conversion rate
  const convertedLeads = leads.filter(l => ["appointment_booked", "treatment_started", "completed"].includes(l.status)).length;
  const conversionRate = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0;

  // Top campaigns
  const topCampaigns = campaigns.map(c => ({
    name: c.name,
    platform: c.platform,
    leads: c.leads,
    conversions: c.conversions,
    budget: c.budget,
    spent: c.spent,
    roi: c.spent > 0 ? Math.round(((c.conversions * 5000 - c.spent) / c.spent) * 100) : 0,
  })).sort((a, b) => b.conversions - a.conversions).slice(0, 6);

  // 6-month trend
  const trend: { month: string; patients: number; revenue: number; commission: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const mSources = sources.filter(s => s.createdAt >= d && s.createdAt < dn);
    const mRef = referrals.filter(r => r.createdAt >= d && r.createdAt < dn);
    trend.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      patients: mSources.length,
      revenue: mRef.reduce((s, r) => s + r.billAmount, 0),
      commission: mRef.reduce((s, r) => s + r.commissionAmount, 0),
    });
  }

  // Top clinics (by Carelim patient count)
  const clinicCount: Record<string, number> = {};
  sources.forEach(s => { if (s.clinicId) clinicCount[s.clinicId] = (clinicCount[s.clinicId] || 0) + 1; });
  const branches = await db.branch.findMany();
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const topClinics = Object.entries(clinicCount).map(([id, count]) => ({ clinicId: id, clinicName: branchMap[id] || id, patients: count })).sort((a, b) => b.patients - a.patients).slice(0, 6);

  // Top doctors (by referrals)
  const docCount: Record<string, { referrals: number; commission: number }> = {};
  referrals.forEach(r => {
    const k = r.doctorId || "unassigned";
    docCount[k] = docCount[k] || { referrals: 0, commission: 0 };
    docCount[k].referrals++;
    docCount[k].commission += r.commissionAmount;
  });
  const doctors = await db.doctor.findMany();
  const docMap = Object.fromEntries(doctors.map(d => [d.id, d.name]));
  const topDoctors = Object.entries(docCount).map(([id, v]) => ({ doctorId: id, doctorName: docMap[id] || id, ...v })).sort((a, b) => b.referrals - a.referrals).slice(0, 6);

  res.json({
    kpis: {
      todayAppointments: todayAppts.length,
      carelimPatients: carelimPatients.length,
      clinicPatients: clinicPatients.length,
      revenueToday: todayRevenue,
      revenueMonth: monthRevenue,
      commissionToday,
      pendingCommission,
      paidCommission,
      monthCommission,
      newLeads,
      followupDue,
      conversionRate,
      totalPatients: sources.length,
      activeLeads: leads.filter(l => !["completed", "lost"].includes(l.status)).length,
      activeCampaigns: campaigns.filter(c => c.status === "active").length,
      activeCoordinators: coordinators.filter(c => c.status === "active").length,
    },
    sourceDist,
    leadStatusDist,
    trend,
    topCampaigns,
    topClinics,
    topDoctors,
    recentActivity: await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }).then(logs => logs.map(a => ({
      user: a.user,
      action: a.action,
      module: a.module,
      detail: a.detail,
      createdAt: a.createdAt,
    }))),
  });
}

export function cmsDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(cmsDashboard));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Leads — /api/cms-leads and /api/cms-leads/[id]
// ════════════════════════════════════════════════════════════════

async function listMsLeads(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const source = req.query.source as string | undefined;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (source) where.source = source;
  const leads = await db.mSLead.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(leads);
}

async function createMsLead(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.mSLead.count();
  const lead = await db.mSLead.create({
    data: { ...body, leadNo: `LEAD-${nanoid(8).toUpperCase()}` },
  });
  await db.auditLog.create({ data: { user: body.assignedTo || "system", action: "CREATE", module: "Carelim MS", detail: `Created lead ${lead.leadNo} from ${body.source}` } });
  res.status(201).json(lead);
}

async function getMsLead(req: Request, res: Response) {
  const id = req.params.id as string;
  const lead = await db.mSLead.findUnique({ where: { id } });
  if (!lead) return fail(res, 404, "Not found");
  res.json(lead);
}

// Convert lead to patient — sets status and convertedPatientId
async function updateMsLead(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "completed" || body.status === "treatment_started") {
    data.convertedAt = new Date();
  }
  const lead = await db.mSLead.update({ where: { id }, data: data as never });
  await db.auditLog.create({ data: { user: "system", action: "UPDATE", module: "Carelim MS", detail: `Lead ${lead.leadNo} status → ${body.status}` } });
  res.json(lead);
}

async function deleteMsLead(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.mSLead.delete({ where: { id } });
  res.json({ ok: true });
}

export function cmsLeadsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listMsLeads));
  r.post("/", wrap(createMsLead));
  r.get("/:id", wrap(getMsLead));
  r.patch("/:id", wrap(updateMsLead));
  r.delete("/:id", wrap(deleteMsLead));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Patient Sources — /api/cms-patient-sources and /api/cms-patient-sources/[id]
// ════════════════════════════════════════════════════════════════

async function listPatientSources(req: Request, res: Response) {
  const sourceType = req.query.sourceType as string | undefined;
  const q = req.query.q as string | undefined;
  const where: Record<string, unknown> = {};
  if (sourceType) where.sourceType = sourceType;
  const sources = await db.patientSource.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  // Enrich with patient, branch, campaign data
  const patientIds = [...new Set(sources.map(s => s.patientId))];
  const branchIds = [...new Set(sources.map(s => s.clinicId).filter(Boolean) as string[])];
  const campaignIds = [...new Set(sources.map(s => s.campaignId).filter(Boolean) as string[])];
  const [patients, branches, campaigns] = await Promise.all([
    db.patient.findMany({ where: { id: { in: patientIds } } }),
    db.branch.findMany({ where: { id: { in: branchIds } } }),
    db.campaign.findMany({ where: { id: { in: campaignIds } } }),
  ]);
  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c.name]));

  let result = sources.map(s => ({
    ...s,
    patient: patientMap[s.patientId] ? { id: patientMap[s.patientId].id, name: patientMap[s.patientId].name, patientCode: patientMap[s.patientId].patientCode, phone: patientMap[s.patientId].phone, age: patientMap[s.patientId].age, gender: patientMap[s.patientId].gender } : null,
    clinicName: s.clinicId ? branchMap[s.clinicId] || "—" : "—",
    campaignName: s.campaignId ? campaignMap[s.campaignId] || "—" : "—",
  }));
  if (q) {
    const ql = q.toLowerCase();
    result = result.filter(r => r.patient?.name.toLowerCase().includes(ql) || r.trackingId.toLowerCase().includes(ql) || r.patient?.phone.includes(q) || r.patient?.patientCode.toLowerCase().includes(ql));
  }
  res.json(result);
}

async function createPatientSource(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.patientSource.count();
  const trackingId = `CMS-${nanoid(8).toUpperCase()}`;
  const source = await db.patientSource.create({
    data: { ...body, trackingId },
  });
  await db.patientActivityLog.create({ data: { patientId: body.patientId, activity: "appointment_booked", description: `Patient registered as ${body.sourceType} via ${body.sourceName}`, performedBy: body.createdBy || "system" } });
  await db.auditLog.create({ data: { user: body.createdBy || "system", action: "CREATE", module: "Carelim MS", detail: `Created patient source ${trackingId} (${body.sourceType}/${body.sourceName})` } });
  res.status(201).json({ ...source, trackingId });
}

async function getPatientSource(req: Request, res: Response) {
  const id = req.params.id as string;
  const source = await db.patientSource.findUnique({ where: { id } });
  if (!source) return fail(res, 404, "Not found");
  res.json(source);
}

async function updatePatientSource(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const source = await db.patientSource.update({ where: { id }, data: body });
  res.json(source);
}

async function deletePatientSource(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.patientSource.delete({ where: { id } });
  res.json({ ok: true });
}

export function cmsPatientSourcesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPatientSources));
  r.post("/", wrap(createPatientSource));
  r.get("/:id", wrap(getPatientSource));
  r.patch("/:id", wrap(updatePatientSource));
  r.delete("/:id", wrap(deletePatientSource));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Referrals — /api/cms-referrals and /api/cms-referrals/[id]
// ════════════════════════════════════════════════════════════════

async function listReferrals(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const referrals = await db.referral.findMany({ where, orderBy: { createdAt: "desc" } });
  // Enrich with patient, doctor, branch, campaign names
  const patientIds = [...new Set(referrals.map(r => r.patientId))];
  const doctorIds = [...new Set(referrals.map(r => r.doctorId).filter(Boolean) as string[])];
  const branchIds = [...new Set(referrals.map(r => r.clinicId).filter(Boolean) as string[])];
  const [patients, doctors, branches] = await Promise.all([
    db.patient.findMany({ where: { id: { in: patientIds } } }),
    db.doctor.findMany({ where: { id: { in: doctorIds } } }),
    db.branch.findMany({ where: { id: { in: branchIds } } }),
  ]);
  const pMap = Object.fromEntries(patients.map(p => [p.id, p.name]));
  const dMap = Object.fromEntries(doctors.map(d => [d.id, d.name]));
  const bMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  res.json(referrals.map(r => ({
    ...r,
    patientName: pMap[r.patientId] || r.patientId,
    doctorName: r.doctorId ? dMap[r.doctorId] || "—" : "—",
    clinicName: r.clinicId ? bMap[r.clinicId] || "—" : "—",
  })));
}

async function createReferral(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.referral.count();
  const referral = await db.referral.create({
    data: { ...body, referralNo: `REF-${nanoid(8).toUpperCase()}` },
  });
  // Tag patient as coming from Carelim MS (if not already tagged)
  const existingSource = await db.patientSource.findFirst({ where: { patientId: body.patientId } });
  if (!existingSource) {
    await db.patientSource.create({
      data: {
        patientId: body.patientId,
        sourceType: "carelim",
        sourceName: "carelim_ms",
        trackingId: `CMS-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  }

  await db.patientActivityLog.create({ data: { patientId: body.patientId, activity: "commission_generated", description: `Referral ${referral.referralNo} created — ${body.commissionRate}% commission`, performedBy: "system" } });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Carelim MS", detail: `Created referral ${referral.referralNo}` } });
  res.status(201).json(referral);
}

async function getReferral(req: Request, res: Response) {
  const id = req.params.id as string;
  const r = await db.referral.findUnique({ where: { id } });
  if (!r) return fail(res, 404, "Not found");
  res.json(r);
}

// Settle a referral — creates a CommissionSettlement record
async function updateReferral(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const r = await db.referral.update({ where: { id }, data: { ...body, settledAt: body.status === "settled" ? new Date() : null } });
  if (body.status === "settled") {
    const count = await db.commissionSettlement.count();
    await db.commissionSettlement.create({
      data: {
        settlementNo: `STL-${nanoid(8).toUpperCase()}`,
        referralId: id,
        clinicId: r.clinicId,
        doctorId: r.doctorId,
        amount: r.commissionAmount,
        status: "paid",
        paidAt: new Date(),
        month: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      },
    });
    await db.auditLog.create({ data: { user: "system", action: "UPDATE", module: "Carelim MS", detail: `Settled referral ${r.referralNo} — Rs. ${r.commissionAmount}` } });
  }
  res.json(r);
}

async function deleteReferral(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.referral.delete({ where: { id } });
  res.json({ ok: true });
}

export function cmsReferralsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listReferrals));
  r.post("/", wrap(createReferral));
  r.get("/:id", wrap(getReferral));
  r.patch("/:id", wrap(updateReferral));
  r.delete("/:id", wrap(deleteReferral));
  return r;
}

// ════════════════════════════════════════════════════════════════
// CMS Reports — /api/cms-reports
// ════════════════════════════════════════════════════════════════

async function cmsReports(_req: Request, res: Response) {
  const [sources, referrals, leads, campaigns, coordinators, settlements, apptExts] = await Promise.all([
    db.patientSource.findMany(),
    db.referral.findMany(),
    db.mSLead.findMany(),
    db.campaign.findMany(),
    db.careCoordinator.findMany(),
    db.commissionSettlement.findMany(),
    db.appointmentExtension.findMany(),
  ]);

  const carelimPatients = sources.filter(s => s.sourceType === "carelim");
  const clinicPatients = sources.filter(s => s.sourceType === "clinic");
  const totalRevenue = referrals.reduce((s, r) => s + r.billAmount, 0);
  const totalCommission = referrals.reduce((s, r) => s + r.commissionAmount, 0);
  const pendingCommission = referrals.filter(r => r.status === "pending" || r.status === "earned").reduce((s, r) => s + r.commissionAmount, 0);
  const paidCommission = settlements.filter(s => s.status === "paid").reduce((s, r) => s + r.amount, 0);

  // Source breakdown
  const bySource: Record<string, number> = {};
  sources.forEach(s => { bySource[s.sourceName] = (bySource[s.sourceName] || 0) + 1; });

  // Lead conversion
  const convertedLeads = leads.filter(l => ["appointment_booked", "treatment_started", "completed"].includes(l.status)).length;
  const leadConversion = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0;

  // Appointment conversion (booked → completed)
  const completedAppts = apptExts.filter(a => a.status === "completed").length;
  const apptConversion = apptExts.length > 0 ? Math.round((completedAppts / apptExts.length) * 100) : 0;

  // Campaign performance
  const campaignPerf = campaigns.map(c => ({
    name: c.name,
    platform: c.platform,
    budget: c.budget,
    spent: c.spent,
    leads: c.leads,
    conversions: c.conversions,
    cpl: c.leads > 0 ? Math.round(c.spent / c.leads) : 0,
    cpa: c.conversions > 0 ? Math.round(c.spent / c.conversions) : 0,
    roi: c.spent > 0 ? Math.round(((c.conversions * 5000 - c.spent) / c.spent) * 100) : 0,
  }));

  // Patient retention (patients with >1 activity)
  const patientActCount: Record<string, number> = {};
  const logs = await db.patientActivityLog.findMany();
  logs.forEach(l => { patientActCount[l.patientId] = (patientActCount[l.patientId] || 0) + 1; });
  const retained = Object.values(patientActCount).filter(c => c > 3).length;
  const retentionRate = sources.length > 0 ? Math.round((retained / sources.length) * 100) : 0;

  res.json({
    summary: {
      totalPatients: sources.length,
      carelimPatients: carelimPatients.length,
      clinicPatients: clinicPatients.length,
      totalRevenue,
      totalCommission,
      pendingCommission,
      paidCommission,
      totalLeads: leads.length,
      convertedLeads,
      leadConversion,
      apptConversion,
      retentionRate,
      activeCampaigns: campaigns.filter(c => c.status === "active").length,
      activeCoordinators: coordinators.filter(c => c.status === "active").length,
    },
    bySource,
    campaignPerformance: campaignPerf,
    leadsByStatus: leads.reduce((m, l) => { m[l.status] = (m[l.status] || 0) + 1; return m; }, {} as Record<string, number>),
    referrals: referrals.map(r => ({ referralNo: r.referralNo, patientId: r.patientId, commissionAmount: r.commissionAmount, status: r.status, createdAt: r.createdAt })),
  });
}

export function cmsReportsRouter(): Router {
  const r = Router();
  r.get("/", wrap(cmsReports));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Leads — /api/leads and /api/leads/[id]
// ════════════════════════════════════════════════════════════════

async function listLeads(_req: Request, res: Response) {
  const l = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
  res.json(l);
}

async function createLead(req: Request, res: Response) {
  const body = req.body || {};
  const l = await db.lead.create({ data: body });
  res.status(201).json(l);
}

async function updateLead(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const l = await db.lead.update({ where: { id }, data: body });
  res.json(l);
}

async function deleteLead(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.lead.delete({ where: { id } });
  res.json({ ok: true });
}

export function leadsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLeads));
  r.post("/", wrap(createLead));
  r.patch("/:id", wrap(updateLead));
  r.delete("/:id", wrap(deleteLead));
  return r;
}

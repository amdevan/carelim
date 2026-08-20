import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const tenants = await db.tenant.findMany({ include: { plan: true, usageRecords: { take: 1, orderBy: { date: "desc" } } } });
  const invoices = await db.saaSInvoice.findMany();
  const monthInvoices = invoices.filter(i => i.date >= startOfMonth && i.status === "paid");
  const plans = await db.plan.findMany({ include: { _count: { select: { tenants: true } } } });
  const tickets = await db.supportTicket.findMany();
  const leads = await db.lead.findMany();
  const auditLogs = await db.saaSAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  const monthlyRevenue = monthInvoices.reduce((s, i) => s + i.total, 0);
  const mrr = tenants.filter(t => t.status === "active").reduce((s, t) => s + (t.plan?.priceMonthly || 0), 0);
  const totalDoctors = tenants.reduce((s, t) => s + (t.usageRecords[0]?.doctorCount || 0), 0);
  const totalPatients = tenants.reduce((s, t) => s + (t.usageRecords[0]?.patientCount || 0), 0);
  const tenantGrowth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1); const c = await db.tenant.count({ where: { createdAt: { gte: d, lt: dn } } }); tenantGrowth.push({ month: d.toLocaleDateString("en-US", { month: "short" }), count: c }); }
  const revenueTrend: { month: string; subscription: number; addOn: number; commission: number }[] = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1); const mi = await db.saaSInvoice.findMany({ where: { date: { gte: d, lt: dn }, status: "paid" } }); const sub = mi.reduce((s, inv) => s + inv.amount, 0); revenueTrend.push({ month: d.toLocaleDateString("en-US", { month: "short" }), subscription: sub, addOn: Math.round(sub * 0.15), commission: Math.round(sub * 0.05) }); }
  return NextResponse.json({ kpis: { totalClinics: tenants.length, activeTenants: tenants.filter(t => t.status === "active").length, trialTenants: tenants.filter(t => t.status === "trial").length, suspendedTenants: tenants.filter(t => t.status === "suspended").length, totalDoctors, totalPatients, totalAppointments: tenants.reduce((s, t) => s + (t.usageRecords[0]?.appointmentCount || 0), 0), mrr, annualRevenue: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0), monthlyRevenue, churnRate: tenants.length > 0 ? Math.round((tenants.filter(t => t.status === "suspended").length / tenants.length) * 100) : 0, subscriptionGrowth: tenantGrowth[5]?.count || 0 }, plans: plans.map(p => ({ ...p, tenantCount: p._count.tenants })), revenueTrend, tenantGrowth, tickets: { open: tickets.filter(t => t.status === "open").length, assigned: tickets.filter(t => t.status === "assigned").length, resolved: tickets.filter(t => t.status === "resolved").length, total: tickets.length }, leads: { total: leads.length, converted: leads.filter(l => l.status === "converted").length, trial: leads.filter(l => l.status === "trial").length, demo: leads.filter(l => l.status === "demo").length }, recentActivity: auditLogs.map(a => ({ adminEmail: a.adminEmail, action: a.action, module: a.module, detail: a.detail, createdAt: a.createdAt })), tenants: tenants.slice(0, 5).map(t => ({ id: t.id, name: t.name, plan: t.plan?.name, status: t.status, ownerEmail: t.ownerEmail, city: t.city, createdAt: t.createdAt, lastLoginAt: t.lastLoginAt })) });
}

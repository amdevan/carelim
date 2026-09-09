import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalTenants,
      activeSubscriptions,
      trialTenants,
      suspendedTenants,
      totalDoctors,
      totalPatients,
      revenueResult,
      plansRaw,
      recentTenants,
      tickets,
      leads,
      allTenants,
    ] = await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { status: "active" } }),
      db.tenant.count({ where: { status: "trial" } }),
      db.tenant.count({ where: { status: "suspended" } }),
      db.doctor.count(),
      db.patient.count(),
      db.saaSInvoice.aggregate({
        _sum: { total: true },
        where: {
          date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      db.plan.findMany({
        orderBy: { priceMonthly: "asc" },
        include: { _count: { select: { tenants: true } } },
      }),
      db.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      db.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      db.tenant.findMany({ select: { createdAt: true, status: true } }),
    ]);

    // Tenant growth (last 6 months)
    const now = new Date();
    const tenantGrowth: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = d.toLocaleString("en-US", { month: "short" });
      const count = allTenants.filter(t => t.createdAt >= d && t.createdAt < nextMonth).length;
      tenantGrowth.push({ month: monthStr, count });
    }

    // Revenue trend (last 6 months) with breakdown
    const invoices = await db.saaSInvoice.findMany({ select: { total: true, date: true, description: true } });
    const revenueTrend: { month: string; subscription: number; addOn: number; commission: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = d.toLocaleString("en-US", { month: "short" });
      const monthInvoices = invoices.filter(inv => inv.date >= d && inv.date < nextMonth);
      const subscription = monthInvoices.filter(inv => !inv.description?.toLowerCase().includes("add-on") && !inv.description?.toLowerCase().includes("commission")).reduce((s, inv) => s + (inv.total || 0), 0);
      const addOn = monthInvoices.filter(inv => inv.description?.toLowerCase().includes("add-on")).reduce((s, inv) => s + (inv.total || 0), 0);
      const commission = monthInvoices.filter(inv => inv.description?.toLowerCase().includes("commission")).reduce((s, inv) => s + (inv.total || 0), 0);
      revenueTrend.push({ month: monthStr, subscription, addOn, commission });
    }

    // Plans with tenant count
    const plans = plansRaw.map(p => ({
      ...p,
      tenantCount: p._count.tenants,
    }));

    // Recent activity
    const auditLogs = await db.saaSAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
    const recentActivity = auditLogs.map(a => ({
      adminEmail: a.adminEmail,
      action: a.action,
      module: a.module,
      detail: a.detail,
      createdAt: a.createdAt,
    }));

    // Churn rate: suspended / total (as percentage)
    const churnRate = totalTenants > 0 ? Math.round((suspendedTenants / totalTenants) * 100 * 10) / 10 : 0;
    const monthlyRevenue = revenueResult._sum.total ?? 0;

    // Aggregate tickets into summary
    const ticketSummary = {
      open: tickets.filter((t: any) => t.status === "open").length,
      assigned: tickets.filter((t: any) => t.status === "assigned").length,
      resolved: tickets.filter((t: any) => t.status === "resolved").length,
      total: tickets.length,
    };

    // Aggregate leads into summary
    const leadSummary = {
      total: leads.length,
      converted: leads.filter((l: any) => l.status === "converted").length,
      trial: leads.filter((l: any) => l.status === "trial").length,
      demo: leads.filter((l: any) => l.status === "demo").length,
    };

    return NextResponse.json({
      kpis: {
        totalClinics: totalTenants,
        activeTenants: activeSubscriptions,
        trialTenants,
        suspendedTenants,
        totalDoctors,
        totalPatients,
        mrr: monthlyRevenue,
        annualRevenue: monthlyRevenue * 12,
        monthlyRevenue,
        churnRate,
        subscriptionGrowth: activeSubscriptions,
      },
      plans,
      revenueTrend,
      tenantGrowth,
      recentActivity,
      tenants: recentTenants,
      tickets: ticketSummary,
      leads: leadSummary,
    });
  } catch (error) {
    console.error("saas-dashboard error:", error);
    return NextResponse.json({
      kpis: { totalClinics: 0, activeTenants: 0, trialTenants: 0, suspendedTenants: 0, totalDoctors: 0, totalPatients: 0, mrr: 0, annualRevenue: 0, monthlyRevenue: 0, churnRate: 0, subscriptionGrowth: 0 },
      plans: [],
      revenueTrend: [],
      tenantGrowth: [],
      recentActivity: [],
      tenants: [],
      tickets: [],
      leads: [],
    });
  }
}

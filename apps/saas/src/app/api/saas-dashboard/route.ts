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
      plans,
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
      db.plan.findMany({ orderBy: { priceMonthly: "asc" } }),
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

    // Revenue trend (last 6 months)
    const revenueTrend: { month: string; revenue: number }[] = [];
    const invoices = await db.saaSInvoice.findMany({ select: { total: true, date: true } });
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = d.toLocaleString("en-US", { month: "short" });
      const revenue = invoices.filter(inv => inv.date >= d && inv.date < nextMonth).reduce((s, inv) => s + (inv.total || 0), 0);
      revenueTrend.push({ month: monthStr, revenue });
    }

    // Recent activity
    const auditLogs = await db.saaSAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
    const recentActivity = auditLogs.map(a => ({
      id: a.id,
      action: a.action,
      tenant: allTenants.length > 0 ? "Tenant" : "System",
      admin: a.adminEmail,
      time: a.createdAt,
    }));

    return NextResponse.json({
      kpis: {
        totalClinics: totalTenants,
        activeTenants: activeSubscriptions,
        trialTenants,
        suspendedTenants,
        totalDoctors,
        totalPatients,
        mrr: revenueResult._sum.total ?? 0,
        annualRevenue: (revenueResult._sum.total ?? 0) * 12,
        subscriptionGrowth: activeSubscriptions,
      },
      plans,
      revenueTrend,
      tenantGrowth,
      recentActivity,
      tenants: recentTenants,
      tickets,
      leads,
    });
  } catch (error) {
    console.error("saas-dashboard error:", error);
    return NextResponse.json({
      kpis: { totalClinics: 0, activeTenants: 0, trialTenants: 0, suspendedTenants: 0, totalDoctors: 0, totalPatients: 0, mrr: 0, annualRevenue: 0, subscriptionGrowth: 0 },
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

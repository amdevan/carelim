import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalTenants, activeSubscriptions, totalDoctors, totalPatients, revenueResult] =
      await Promise.all([
        db.tenant.count(),
        db.tenant.count({ where: { status: "active" } }),
        db.doctor.count(),
        db.patient.count(),
        db.saaSInvoice.aggregate({
          _sum: { total: true },
          where: {
            date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

    return NextResponse.json({
      kpis: {
        totalClinics: totalTenants,
        activeTenants: activeSubscriptions,
        trialTenants: await db.tenant.count({ where: { status: "trial" } }),
        suspendedTenants: await db.tenant.count({ where: { status: "suspended" } }),
        totalDoctors,
        totalPatients,
        mrr: revenueResult._sum.total ?? 0,
        annualRevenue: (revenueResult._sum.total ?? 0) * 12,
      },
    });
  } catch (error) {
    console.error("saas-dashboard error:", error);
    return NextResponse.json({
      kpis: { totalClinics: 0, activeTenants: 0, trialTenants: 0, suspendedTenants: 0, totalDoctors: 0, totalPatients: 0, mrr: 0, annualRevenue: 0 },
    });
  }
}

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
      totalTenants,
      activeSubscriptions,
      totalDoctors,
      totalPatients,
      monthlyRevenue: revenueResult._sum.total ?? 0,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}

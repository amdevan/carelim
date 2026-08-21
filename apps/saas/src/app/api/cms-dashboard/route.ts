import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalLeads, activeCampaigns, totalPatients, totalRevenue] =
      await Promise.all([
        db.mSLead.count(),
        db.campaign.count({ where: { status: "active" } }),
        db.patient.count(),
        db.invoice.aggregate({ _sum: { total: true } }),
      ]);

    return NextResponse.json({
      totalLeads,
      activeCampaigns,
      totalPatients,
      totalRevenue: totalRevenue._sum.total || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

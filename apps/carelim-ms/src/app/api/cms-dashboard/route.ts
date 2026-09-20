import { NextResponse } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const [totalLeads, activeCampaigns, totalPatients, totalRevenue] = await Promise.all([
      prisma.mSLead.count(),
      prisma.campaign.count({ where: { status: "active" } }),
      prisma.patient.count(),
      prisma.invoice.aggregate({ _sum: { total: true } }),
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

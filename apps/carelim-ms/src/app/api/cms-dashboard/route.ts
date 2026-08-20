import { NextResponse } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const [totalLeads, activeCampaigns, totalPatients, totalRevenue] = await Promise.all([
      prisma.mSLead.count(),
      prisma.campaign.count({ where: { isActive: true } }),
      prisma.patient.count(),
      prisma.invoice.aggregate({ _sum: { totalAmount: true } }),
    ]);
    return NextResponse.json({
      totalLeads,
      activeCampaigns,
      totalPatients,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalLeads, activeCampaigns, totalPatients, totalRevenue] =
      await Promise.all([
        db.mSLead?.count?.() ?? Promise.resolve(0),
        db.campaign?.count?.({ where: { status: "active" } }) ?? Promise.resolve(0),
        db.patient?.count?.() ?? Promise.resolve(0),
        db.invoice?.aggregate?.({ _sum: { total: true } }).then((r: any) => r?._sum?.total ?? 0) ?? Promise.resolve(0),
      ]);

    return NextResponse.json({
      totalLeads,
      activeCampaigns,
      totalPatients,
      totalRevenue,
    });
  } catch (error) {
    console.error("CMS Dashboard error:", error);
    return NextResponse.json({
      totalLeads: 0,
      activeCampaigns: 0,
      totalPatients: 0,
      totalRevenue: 0,
    });
  }
}

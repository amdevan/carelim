import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalLeads, activeCampaigns, totalContacts, pendingDeals, referralResult, convertedLeads, totalLeadCount] =
      await Promise.all([
        db.lead.count(),
        db.campaign.count({ where: { status: "active" } }),
        db.cRMContact.count(),
        db.cRMDeal.count({
          where: { stage: { notIn: ["closed_won", "closed_lost"] } },
        }),
        db.referral.aggregate({
          _sum: { commissionAmount: true },
          where: { status: { in: ["earned", "settled"] } },
        }),
        db.mSLead.count({ where: { status: { not: "lost" } } }),
        db.mSLead.count(),
      ]);

    const conversionRate =
      totalLeadCount > 0 ? Number(((convertedLeads / totalLeadCount) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      totalLeads,
      activeCampaigns,
      conversionRate,
      referralRevenue: referralResult._sum.commissionAmount ?? 0,
      totalContacts,
      pendingDeals,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch CMS dashboard stats" }, { status: 500 });
  }
}

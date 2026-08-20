import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [sources, referrals, leads, campaigns, coordinators, settlements, apptExts] = await Promise.all([
    db.patientSource.findMany(),
    db.referral.findMany(),
    db.mSLead.findMany(),
    db.campaign.findMany(),
    db.careCoordinator.findMany(),
    db.commissionSettlement.findMany(),
    db.appointmentExtension.findMany(),
  ]);

  const carelimPatients = sources.filter(s => s.sourceType === "carelim");
  const clinicPatients = sources.filter(s => s.sourceType === "clinic");
  const totalRevenue = referrals.reduce((s, r) => s + r.billAmount, 0);
  const totalCommission = referrals.reduce((s, r) => s + r.commissionAmount, 0);
  const pendingCommission = referrals.filter(r => r.status === "pending" || r.status === "earned").reduce((s, r) => s + r.commissionAmount, 0);
  const paidCommission = settlements.filter(s => s.status === "paid").reduce((s, r) => s + r.amount, 0);

  // Source breakdown
  const bySource: Record<string, number> = {};
  sources.forEach(s => { bySource[s.sourceName] = (bySource[s.sourceName] || 0) + 1; });

  // Lead conversion
  const convertedLeads = leads.filter(l => ["appointment_booked", "treatment_started", "completed"].includes(l.status)).length;
  const leadConversion = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0;

  // Appointment conversion (booked → completed)
  const completedAppts = apptExts.filter(a => a.status === "completed").length;
  const apptConversion = apptExts.length > 0 ? Math.round((completedAppts / apptExts.length) * 100) : 0;

  // Campaign performance
  const campaignPerf = campaigns.map(c => ({
    name: c.name,
    platform: c.platform,
    budget: c.budget,
    spent: c.spent,
    leads: c.leads,
    conversions: c.conversions,
    cpl: c.leads > 0 ? Math.round(c.spent / c.leads) : 0,
    cpa: c.conversions > 0 ? Math.round(c.spent / c.conversions) : 0,
    roi: c.spent > 0 ? Math.round(((c.conversions * 5000 - c.spent) / c.spent) * 100) : 0,
  }));

  // Patient retention (patients with >1 activity)
  const patientActCount: Record<string, number> = {};
  const logs = await db.patientActivityLog.findMany();
  logs.forEach(l => { patientActCount[l.patientId] = (patientActCount[l.patientId] || 0) + 1; });
  const retained = Object.values(patientActCount).filter(c => c > 3).length;
  const retentionRate = sources.length > 0 ? Math.round((retained / sources.length) * 100) : 0;

  return NextResponse.json({
    summary: {
      totalPatients: sources.length,
      carelimPatients: carelimPatients.length,
      clinicPatients: clinicPatients.length,
      totalRevenue,
      totalCommission,
      pendingCommission,
      paidCommission,
      totalLeads: leads.length,
      convertedLeads,
      leadConversion,
      apptConversion,
      retentionRate,
      activeCampaigns: campaigns.filter(c => c.status === "active").length,
      activeCoordinators: coordinators.filter(c => c.status === "active").length,
    },
    bySource,
    campaignPerformance: campaignPerf,
    leadsByStatus: leads.reduce((m, l) => { m[l.status] = (m[l.status] || 0) + 1; return m; }, {} as Record<string, number>),
    referrals: referrals.map(r => ({ referralNo: r.referralNo, patientId: r.patientId, commissionAmount: r.commissionAmount, status: r.status, createdAt: r.createdAt })),
  });
}

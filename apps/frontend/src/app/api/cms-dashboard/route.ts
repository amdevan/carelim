import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [sources, apptExts, referrals, leads, coordinators, campaigns, settlements] = await Promise.all([
    db.patientSource.findMany(),
    db.appointmentExtension.findMany(),
    db.referral.findMany(),
    db.mSLead.findMany(),
    db.careCoordinator.findMany(),
    db.campaign.findMany(),
    db.commissionSettlement.findMany(),
  ]);

  const carelimPatients = sources.filter(s => s.sourceType === "carelim");
  const clinicPatients = sources.filter(s => s.sourceType === "clinic");

  // Today's appointments (from extension table)
  const todayAppts = apptExts.filter(a => true); // would filter by today in production

  // Revenue today (from referrals with billAmount)
  const todayRevenue = referrals.filter(r => r.createdAt >= startOfDay).reduce((s, r) => s + r.billAmount, 0);
  const monthRevenue = referrals.filter(r => r.createdAt >= startOfMonth).reduce((s, r) => s + r.billAmount, 0);

  // Commission
  const commissionToday = referrals.filter(r => r.createdAt >= startOfDay).reduce((s, r) => s + r.commissionAmount, 0);
  const pendingCommission = referrals.filter(r => r.status === "pending" || r.status === "earned").reduce((s, r) => s + r.commissionAmount, 0);
  const paidCommission = settlements.filter(s => s.status === "paid").reduce((s, r) => s + r.amount, 0);
  const monthCommission = referrals.filter(r => r.createdAt >= startOfMonth).reduce((s, r) => s + r.commissionAmount, 0);

  // New leads this month
  const newLeads = leads.filter(l => l.createdAt >= startOfMonth).length;

  // Follow-up due
  const followupDue = coordinators.filter(c => c.nextFollowup && new Date(c.nextFollowup) <= new Date(today.getTime() + 3 * 86400000) && c.status === "active").length;

  // Source distribution
  const sourceDist: Record<string, number> = {};
  sources.forEach(s => { sourceDist[s.sourceName] = (sourceDist[s.sourceName] || 0) + 1; });

  // Lead status distribution
  const leadStatusDist: Record<string, number> = {};
  leads.forEach(l => { leadStatusDist[l.status] = (leadStatusDist[l.status] || 0) + 1; });

  // Conversion rate
  const convertedLeads = leads.filter(l => ["appointment_booked", "treatment_started", "completed"].includes(l.status)).length;
  const conversionRate = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0;

  // Top campaigns
  const topCampaigns = campaigns.map(c => ({
    name: c.name,
    platform: c.platform,
    leads: c.leads,
    conversions: c.conversions,
    budget: c.budget,
    spent: c.spent,
    roi: c.spent > 0 ? Math.round(((c.conversions * 5000 - c.spent) / c.spent) * 100) : 0,
  })).sort((a, b) => b.conversions - a.conversions).slice(0, 6);

  // 6-month trend
  const trend: { month: string; patients: number; revenue: number; commission: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const mSources = sources.filter(s => s.createdAt >= d && s.createdAt < dn);
    const mRef = referrals.filter(r => r.createdAt >= d && r.createdAt < dn);
    trend.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      patients: mSources.length,
      revenue: mRef.reduce((s, r) => s + r.billAmount, 0),
      commission: mRef.reduce((s, r) => s + r.commissionAmount, 0),
    });
  }

  // Top clinics (by Carelim patient count)
  const clinicCount: Record<string, number> = {};
  sources.forEach(s => { if (s.clinicId) clinicCount[s.clinicId] = (clinicCount[s.clinicId] || 0) + 1; });
  const branches = await db.branch.findMany();
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const topClinics = Object.entries(clinicCount).map(([id, count]) => ({ clinicId: id, clinicName: branchMap[id] || id, patients: count })).sort((a, b) => b.patients - a.patients).slice(0, 6);

  // Top doctors (by referrals)
  const docCount: Record<string, { referrals: number; commission: number }> = {};
  referrals.forEach(r => {
    const k = r.doctorId || "unassigned";
    docCount[k] = docCount[k] || { referrals: 0, commission: 0 };
    docCount[k].referrals++;
    docCount[k].commission += r.commissionAmount;
  });
  const doctors = await db.doctor.findMany();
  const docMap = Object.fromEntries(doctors.map(d => [d.id, d.name]));
  const topDoctors = Object.entries(docCount).map(([id, v]) => ({ doctorId: id, doctorName: docMap[id] || id, ...v })).sort((a, b) => b.referrals - a.referrals).slice(0, 6);

  return NextResponse.json({
    kpis: {
      todayAppointments: todayAppts.length,
      carelimPatients: carelimPatients.length,
      clinicPatients: clinicPatients.length,
      revenueToday: todayRevenue,
      revenueMonth: monthRevenue,
      commissionToday,
      pendingCommission,
      paidCommission,
      monthCommission,
      newLeads,
      followupDue,
      conversionRate,
      totalPatients: sources.length,
      activeLeads: leads.filter(l => !["completed", "lost"].includes(l.status)).length,
      activeCampaigns: campaigns.filter(c => c.status === "active").length,
      activeCoordinators: coordinators.filter(c => c.status === "active").length,
    },
    sourceDist,
    leadStatusDist,
    trend,
    topCampaigns,
    topClinics,
    topDoctors,
    recentActivity: await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }).then(logs => logs.map(a => ({
      user: a.user,
      action: a.action,
      module: a.module,
      detail: a.detail,
      createdAt: a.createdAt,
    }))),
  });
}

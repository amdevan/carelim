import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [cycles, activeCycles, assessments, embryos, transfers, pregnancies, donors, consents, packages, protocols] = await Promise.all([
    db.iVFCycle.findMany({ include: { follicularRecords: true, embryoRecords: true, transfers: true } }),
    db.iVFCycle.count({ where: { status: { in: ["stimulation", "monitoring", "opu", "transfer", "wait"] } } }),
    db.fertilityAssessment.count(),
    db.embryo.count(),
    db.embryoTransfer.count(),
    db.pregnancyFollowup.findMany(),
    db.donorProfile.findMany(),
    db.iVFConsent.count(),
    db.iVFPackage.findMany(),
    db.treatmentProtocol.findMany(),
  ]);

  const monthCycles = cycles.filter(c => c.startDate >= startOfMonth);
  const activePregnancies = pregnancies.filter(p => p.status === "tracking" || p.status === "ongoing");
  const positivePregnancies = pregnancies.filter(p => p.result === "positive");
  const successRate = cycles.length > 0 ? Math.round((positivePregnancies.length / cycles.length) * 100) : 0;

  const statusCounts: Record<string, number> = {};
  cycles.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  const frozenEmbryos = await db.embryo.count({ where: { status: "frozen" } });
  const cryobankItems = await db.cryobankStorage.count();

  const cycleTrend: { month: string; cycles: number; pregnancies: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const mc = await db.iVFCycle.count({ where: { startDate: { gte: d, lt: dn } } });
    const mp = await db.pregnancyFollowup.count({ where: { testDate: { gte: d, lt: dn }, result: "positive" } });
    cycleTrend.push({ month: d.toLocaleDateString("en-US", { month: "short" }), cycles: mc, pregnancies: mp });
  }

  return NextResponse.json({
    kpis: {
      totalCycles: cycles.length,
      activeCycles,
      monthCycles: monthCycles.length,
      totalPatients: cycles.length,
      totalAssessments: assessments,
      totalEmbryos: embryos,
      frozenEmbryos,
      cryobankItems,
      totalTransfers: transfers,
      activePregnancies: activePregnancies.length,
      positivePregnancies: positivePregnancies.length,
      successRate,
      totalDonors: donors.length,
      pendingConsents: consents,
    },
    statusCounts,
    cycleTrend,
    protocols: protocols.map(p => ({ id: p.id, name: p.name, code: p.code, type: p.type, duration: p.duration })),
    packages: packages.map(p => ({ id: p.id, name: p.name, code: p.code, totalCost: p.totalCost })),
    recentCycles: cycles.slice(0, 5).map(c => ({
      id: c.id, cycleNo: c.cycleNo, patientName: c.patientId, status: c.status, cycleNumber: c.cycleNumber, startDate: c.startDate
    })),
    donors: donors.slice(0, 5).map(d => ({ id: d.id, donorCode: d.donorCode, type: d.type, screeningStatus: d.screeningStatus, status: d.status })),
  });
}

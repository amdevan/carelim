import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [studies, todayStudies, alerts, equipment, modalities, schedules] = await Promise.all([
    db.radiologyStudy.findMany({ include: { patient: true, modality: true, images: true, report: true } }),
    db.radiologyStudy.findMany({ where: { createdAt: { gte: startOfDay, lt: endOfDay } }, include: { modality: true } }),
    db.radiologyAlert.findMany({ orderBy: { createdAt: "desc" } }),
    db.radiologyEquipment.findMany({ include: { modality: true } }),
    db.radiologyModality.findMany(),
    db.radiologySchedule.findMany({ where: { scheduledDate: { gte: startOfDay } } }),
  ]);

  const todayOrders = todayStudies.length;
  const pendingScans = studies.filter(s => s.status === "scheduled" || s.status === "in-progress").length;
  const urgentPending = studies.filter(s => (s.status === "scheduled" || s.status === "in-progress") && (s.priority === "urgent" || s.priority === "stat")).length;
  const completed = studies.filter(s => s.status === "completed" || s.status === "reported" || s.status === "released").length;
  const completionRate = studies.length > 0 ? Math.round((completed / studies.length) * 100) : 0;
  const todayRevenue = todayStudies.reduce((s, st) => s + (st.modality?.baseFee || 0) + (st.contrastUsed ? (st.modality?.contrastFee || 0) : 0), 0);

  // Critical alerts
  const criticalAlerts = alerts.filter(a => a.status === "active");
  const pendingReports = studies.filter(s => s.status === "completed" || s.status === "reported").length;

  // Average turnaround time
  const completedStudies = studies.filter(s => s.performedAt && s.releasedAt);
  const avgTAT = completedStudies.length > 0
    ? Math.round(completedStudies.reduce((s, st) => s + (st.releasedAt!.getTime() - st.performedAt!.getTime()) / 3600000, 0) / completedStudies.length * 10) / 10
    : 0;

  // Modality-wise volume
  const modalityVolume = modalities.map(m => ({
    name: m.name,
    count: studies.filter(s => s.modalityId === m.id).length,
    revenue: studies.filter(s => s.modalityId === m.id).reduce((sum, st) => sum + (m.baseFee || 0) + (st.contrastUsed ? (m.contrastFee || 0) : 0), 0),
  })).filter(m => m.count > 0);

  // Equipment utilization
  const equipmentUtil = equipment.map(e => ({
    name: e.name,
    modality: e.modality.name,
    utilization: e.utilizationPct,
    status: e.status,
  }));

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  studies.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });

  // Daily trend (7 days)
  const dailyTrend: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dayStudies = await db.radiologyStudy.findMany({ where: { createdAt: { gte: ds, lt: de } } });
    dailyTrend.push({ date: d.toLocaleDateString("en-US", { weekday: "short" }), count: dayStudies.length });
  }

  return NextResponse.json({
    kpis: {
      todayOrders,
      pendingScans,
      urgentPending,
      completed,
      completionRate,
      todayRevenue,
      pendingReports,
      avgTAT,
      criticalAlerts: criticalAlerts.length,
    },
    modalityVolume,
    equipmentUtil,
    statusCounts,
    dailyTrend,
    criticalAlerts: criticalAlerts.map(a => ({
      id: a.id, patientName: a.patientName, modality: a.modality, bodyPart: a.bodyPart,
      finding: a.finding, severity: a.severity, aiConfidence: a.aiConfidence,
      doctorNotified: a.doctorNotified, smsSent: a.smsSent, erAlerted: a.erAlerted,
      createdAt: a.createdAt,
    })),
    waitingPatients: studies.filter(s => s.status === "scheduled").slice(0, 5).map(s => ({
      studyUid: s.studyUid, patientName: s.patient.name, modality: s.modality.name, bodyPart: s.bodyPart, priority: s.priority,
    })),
    upcomingSchedules: schedules.slice(0, 5).map(s => ({
      patientName: s.patientName, modality: s.modality, bodyPart: s.bodyPart, timeSlot: s.timeSlot, status: s.status,
    })),
  });
}

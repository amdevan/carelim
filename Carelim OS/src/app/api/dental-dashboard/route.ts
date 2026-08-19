import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [exams, plans, procedures, labOrders, orthoCases, implantCases, followups, images] = await Promise.all([
    db.dentalExamination.findMany(),
    db.dentalTreatmentPlan.findMany(),
    db.dentalProcedure.findMany(),
    db.dentalLabOrder.findMany(),
    db.orthodonticCase.findMany(),
    db.implantCase.findMany(),
    db.dentalFollowup.findMany(),
    db.dentalImage.findMany(),
  ]);

  const todayProcedures = procedures.filter(p => p.procedureDate >= startOfDay);
  const todayExams = exams.filter(e => e.examDate >= startOfDay);
  const monthProcedures = procedures.filter(p => p.procedureDate >= startOfMonth);

  // Revenue from procedures (via invoices) — approximate from procedures' invoice totals
  const todayRevenue = todayProcedures.reduce((s, p) => s + (p.invoiceId ? 1 : 0) * 0, 0);
  // Better: fetch invoices linked to dental procedures
  const dentalInvoices = procedures.filter(p => p.invoiceId).map(p => p.invoiceId!);
  const invoices = dentalInvoices.length > 0 ? await db.invoice.findMany({ where: { id: { in: dentalInvoices } } }) : [];
  const totalRevenue = invoices.reduce((s, i) => s + i.paid, 0);
  const monthRevenue = invoices.filter(i => i.date >= startOfMonth).reduce((s, i) => s + i.paid, 0);

  // Appointments for dental — we infer from procedures+exams; reuse real appointments today
  const upcomingAppts = await db.appointment.findMany({
    where: { date: { gte: startOfDay }, status: { in: ["scheduled", "checked-in"] } },
    take: 6,
    orderBy: { date: "asc" },
  });

  const pendingTreatments = plans.filter(p => ["planned", "approved", "in_progress"].includes(p.status));
  const completedProcedures = procedures.filter(p => p.status === "completed");

  // Treatment statistics by type
  const procByType: Record<string, number> = {};
  procedures.forEach(p => { procByType[p.procedureType] = (procByType[p.procedureType] || 0) + 1; });

  const planByType: Record<string, number> = {};
  plans.forEach(p => { planByType[p.treatmentType] = (planByType[p.treatmentType] || 0) + 1; });

  // Status distributions
  const planStatus: Record<string, number> = {};
  plans.forEach(p => { planStatus[p.status] = (planStatus[p.status] || 0) + 1; });

  const labStatus: Record<string, number> = {};
  labOrders.forEach(l => { labStatus[l.status] = (labStatus[l.status] || 0) + 1; });

  const orthoStatus: Record<string, number> = {};
  orthoCases.forEach(o => { orthoStatus[o.status] = (orthoStatus[o.status] || 0) + 1; });

  const implantStatus: Record<string, number> = {};
  implantCases.forEach(i => { implantStatus[i.status] = (implantStatus[i.status] || 0) + 1; });

  // 6-month procedure & revenue trend
  const trend: { month: string; procedures: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const mp = procedures.filter(p => p.procedureDate >= d && p.procedureDate < dn);
    const mInv = invoices.filter(iv => iv.date >= d && iv.date < dn);
    trend.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      procedures: mp.length,
      revenue: mInv.reduce((s, iv) => s + iv.paid, 0),
    });
  }

  // Doctor schedule today (reuse appointments)
  const doctorSchedule = await db.appointment.findMany({
    where: { date: { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86400000) }, status: { in: ["scheduled", "checked-in", "in-consult"] } },
    include: { doctor: true, patient: true },
    orderBy: { time: "asc" },
  });

  return NextResponse.json({
    kpis: {
      todayPatients: todayExams.length,
      todayProcedures: todayProcedures.length,
      upcomingAppointments: upcomingAppts.length,
      revenue: monthRevenue,
      totalRevenue,
      pendingTreatments: pendingTreatments.length,
      completedProcedures: completedProcedures.length,
      activeOrthoCases: orthoCases.filter(o => o.status === "active").length,
      activeImplants: implantCases.filter(i => ["placed", "osseointegrating"].includes(i.status)).length,
      pendingLabOrders: labOrders.filter(l => ["pending", "in_lab"].includes(l.status)).length,
      upcomingFollowups: followups.filter(f => f.status === "scheduled" && f.scheduledDate >= startOfDay).length,
      totalExaminations: exams.length,
      totalImages: images.length,
    },
    procByType,
    planByType,
    planStatus,
    labStatus,
    orthoStatus,
    implantStatus,
    trend,
    recentProcedures: procedures.slice(0, 6).map(p => ({ id: p.id, procNo: p.procNo, patientId: p.patientId, procedureType: p.procedureType, toothNumbers: p.toothNumbers, procedureDate: p.procedureDate, status: p.status })),
    upcomingFollowups: followups.filter(f => f.status === "scheduled").sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()).slice(0, 6).map(f => ({ id: f.id, followupNo: f.followupNo, patientId: f.patientId, type: f.type, scheduledDate: f.scheduledDate, status: f.status })),
    doctorSchedule: doctorSchedule.slice(0, 8).map(a => ({ id: a.id, time: a.time, patientName: a.patient.name, doctorName: a.doctor?.name || "—", status: a.status, reason: a.reason })),
    pendingLabOrdersList: labOrders.filter(l => ["pending", "in_lab"].includes(l.status)).slice(0, 5).map(l => ({ id: l.id, orderNo: l.orderNo, patientId: l.patientId, labType: l.labType, status: l.status, sentDate: l.sentDate, deliveryDate: l.deliveryDate })),
  });
}

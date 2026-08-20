import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const today = new Date();
  const from = fromStr ? new Date(fromStr) : new Date(today.getFullYear(), today.getMonth(), 1);
  const to = toStr ? new Date(toStr) : today;

  const [exams, plans, procedures, labOrders, orthoCases, implantCases, followups] = await Promise.all([
    db.dentalExamination.findMany({ where: { examDate: { gte: from, lte: to } } }),
    db.dentalTreatmentPlan.findMany({ where: { createdAt: { gte: from, lte: to } } }),
    db.dentalProcedure.findMany({ where: { procedureDate: { gte: from, lte: to } } }),
    db.dentalLabOrder.findMany({ where: { sentDate: { gte: from, lte: to } } }),
    db.orthodonticCase.findMany({ where: { startDate: { gte: from, lte: to } } }),
    db.implantCase.findMany({ where: { placementDate: { gte: from, lte: to } } }),
    db.dentalFollowup.findMany(),
  ]);

  // Revenue: pull invoices linked to procedures
  const dentalInvoicesIds = procedures.filter(p => p.invoiceId).map(p => p.invoiceId!);
  const invoices = dentalInvoicesIds.length > 0 ? await db.invoice.findMany({ where: { id: { in: dentalInvoicesIds } } }) : [];
  const totalRevenue = invoices.reduce((s, i) => s + i.paid, 0);

  // By doctor — aggregate procedures & revenue by doctorId
  const byDoctor: Record<string, { procedures: number; revenue: number; exams: number }> = {};
  for (const p of procedures) {
    const k = p.doctorId || "unassigned";
    byDoctor[k] = byDoctor[k] || { procedures: 0, revenue: 0, exams: 0 };
    byDoctor[k].procedures++;
  }
  for (const iv of invoices) {
    const proc = procedures.find(p => p.invoiceId === iv.id);
    const k = proc?.doctorId || "unassigned";
    byDoctor[k] = byDoctor[k] || { procedures: 0, revenue: 0, exams: 0 };
    byDoctor[k].revenue += iv.paid;
  }
  for (const e of exams) {
    const k = e.doctorId || "unassigned";
    byDoctor[k] = byDoctor[k] || { procedures: 0, revenue: 0, exams: 0 };
    byDoctor[k].exams++;
  }
  const doctors = await db.doctor.findMany();
  const doctorMap: Record<string, string> = Object.fromEntries(doctors.map(d => [d.id, d.name]));
  const byDoctorArray = Object.entries(byDoctor).map(([id, v]) => ({ doctorId: id, doctorName: doctorMap[id] || id, ...v }));

  // By procedure type
  const byType: Record<string, { count: number; revenue: number }> = {};
  for (const p of procedures) {
    byType[p.procedureType] = byType[p.procedureType] || { count: 0, revenue: 0 };
    byType[p.procedureType].count++;
    const inv = invoices.find(iv => iv.id === p.invoiceId);
    if (inv) byType[p.procedureType].revenue += inv.paid;
  }

  // Tooth-wise treatment count
  const toothTreatments: Record<string, number> = {};
  for (const p of procedures) {
    if (!p.toothNumbers) continue;
    p.toothNumbers.split(",").map(s => s.trim()).forEach(t => {
      if (t) toothTreatments[t] = (toothTreatments[t] || 0) + 1;
    });
  }

  // Insurance claims — from invoices that have insuranceProvider on patient (demo: just count paid invoices)
  const insuranceClaims = invoices.filter(iv => iv.status === "paid").length;

  return NextResponse.json({
    period: { from, to },
    summary: {
      totalExaminations: exams.length,
      totalProcedures: procedures.length,
      totalPlans: plans.length,
      pendingPlans: plans.filter(p => ["planned", "approved", "in_progress"].includes(p.status)).length,
      completedPlans: plans.filter(p => p.status === "completed").length,
      totalRevenue,
      totalLabOrders: labOrders.length,
      pendingLabOrders: labOrders.filter(l => ["pending", "in_lab"].includes(l.status)).length,
      totalOrthoCases: orthoCases.length,
      totalImplantCases: implantCases.length,
      totalFollowups: followups.length,
      pendingFollowups: followups.filter(f => f.status === "scheduled").length,
      insuranceClaims,
    },
    byDoctor: byDoctorArray,
    byType: Object.entries(byType).map(([type, v]) => ({ treatmentType: type, ...v })),
    toothTreatments: Object.entries(toothTreatments).map(([tooth, count]) => ({ toothNumber: tooth, count })).sort((a, b) => b.count - a.count),
    procedures: procedures.map(p => ({
      procNo: p.procNo,
      patientId: p.patientId,
      procedureType: p.procedureType,
      toothNumbers: p.toothNumbers,
      procedureDate: p.procedureDate,
      status: p.status,
      doctorId: p.doctorId,
      doctorName: doctorMap[p.doctorId || ""] || "—",
      revenue: invoices.find(iv => iv.id === p.invoiceId)?.paid || 0,
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [patients, doctors, todayAppts, todayInvoices, allInvoices, labTests, medicines, prescriptions] = await Promise.all([
    db.patient.count(),
    db.doctor.count(),
    db.appointment.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
    db.invoice.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
    db.invoice.findMany({ where: { date: { gte: startOfMonth } } }),
    db.labTest.count(),
    db.medicine.findMany(),
    db.prescription.count(),
  ]);

  const todayRevenue = todayInvoices.reduce((s, i) => s + i.paid, 0);
  const todayDue = todayInvoices.reduce((s, i) => s + i.due, 0);
  const monthRevenue = allInvoices.reduce((s, i) => s + i.paid, 0);
  const todayQueue = todayAppts.filter(a => ["scheduled", "checked-in", "in-consult"].includes(a.status)).length;

  const revenueDays: { date: string; revenue: number; appointments: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const invs = await db.invoice.findMany({ where: { date: { gte: ds, lt: de } } });
    const appts = await db.appointment.findMany({ where: { date: { gte: ds, lt: de } } });
    revenueDays.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      revenue: invs.reduce((s, i) => s + i.paid, 0),
      appointments: appts.length,
    });
  }

  const patientGrowth: { month: string; patients: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const count = await db.patient.count({ where: { registeredAt: { gte: d, lt: dn } } });
    patientGrowth.push({ month: d.toLocaleDateString("en-US", { month: "short" }), patients: count });
  }

  const depts = await db.department.findMany({ include: { _count: { select: { appointments: { where: { date: { gte: startOfMonth } } } } } } });
  const deptAppts = depts.map(d => ({ name: d.name, value: d._count.appointments, color: d.color }));

  const statusCounts: Record<string, number> = {};
  todayAppts.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

  const lowStock = medicines.filter(m => m.stockQty <= m.reorderLevel);
  const expiringSoon = medicines.filter(m => {
    const days = Math.floor((m.expiryDate.getTime() - today.getTime()) / 86400000);
    return days <= 60;
  });

  const recentActivities = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 });

  return NextResponse.json({
    kpis: {
      todayPatients: todayAppts.length,
      todayAppointments: todayAppts.length,
      todayRevenue,
      todayCollection: todayRevenue,
      todayDue,
      todayQueue,
      todayPrescriptions: prescriptions,
      monthRevenue,
      totalPatients: patients,
      totalDoctors: doctors,
      pendingLabs: labTests,
    },
    revenueDays,
    patientGrowth,
    deptAppts,
    statusCounts,
    lowStock,
    expiringSoon,
    recentActivities,
  });
}

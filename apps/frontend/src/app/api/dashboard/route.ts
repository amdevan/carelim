import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling } from "@/lib/api-error";

export const GET = withErrorHandling(async () => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Build date ranges for the last 7 days and 6 months for batch queries
  const last7Days: { gte: Date; lt: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push({
      gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
    });
  }

  const last6Months: { gte: Date; lt: Date; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    last6Months.push({
      gte: d,
      lt: dn,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }

  // Batch query: all invoices and appointments for last 7 days in one query each
  const [patients, doctors, todayAppts, todayInvoices, allInvoices, labTests, medicines, prescriptions, recentActivities, weekInvoices, weekAppointments, monthlyPatients, depts] =
    await Promise.all([
      db.patient.count(),
      db.doctor.count(),
      db.appointment.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
      db.invoice.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
      db.invoice.findMany({ where: { date: { gte: startOfMonth } } }),
      db.labTest.count(),
      db.medicine.findMany(),
      db.prescription.count(),
      db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      // Batch: get all invoices for last 7 days in one query
      db.invoice.findMany({
        where: {
          date: { gte: last7Days[0].gte, lt: last7Days[6].lt },
        },
        select: { date: true, paid: true },
      }),
      // Batch: get all appointments for last 7 days in one query
      db.appointment.findMany({
        where: {
          date: { gte: last7Days[0].gte, lt: last7Days[6].lt },
        },
        select: { date: true },
      }),
      // Batch: get all patients for last 6 months in one query
      db.patient.findMany({
        where: {
          registeredAt: { gte: last6Months[0].gte, lt: last6Months[5].lt },
        },
        select: { registeredAt: true },
      }),
      // Departments with appointment counts
      db.department.findMany({
        include: {
          _count: {
            select: {
              appointments: { where: { date: { gte: startOfMonth } } },
            },
          },
        },
      }),
    ]);

  // Compute today's KPIs
  const todayRevenue = todayInvoices.reduce((s, i) => s + i.paid, 0);
  const todayDue = todayInvoices.reduce((s, i) => s + i.due, 0);
  const monthRevenue = allInvoices.reduce((s, i) => s + i.paid, 0);
  const todayQueue = todayAppts.filter((a) =>
    ["scheduled", "checked-in", "in-consult"].includes(a.status)
  ).length;

  // Compute revenue per day from batch query (no N+1)
  const revenueDays: { date: string; revenue: number; appointments: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

    const dayInvoices = weekInvoices.filter(
      (inv) => inv.date.toDateString() === dayStr
    );
    const dayAppointments = weekAppointments.filter(
      (apt) => apt.date.toDateString() === dayStr
    );

    revenueDays.push({
      date: dayLabel,
      revenue: dayInvoices.reduce((s, i) => s + i.paid, 0),
      appointments: dayAppointments.length,
    });
  }

  // Compute patient growth from batch query (no N+1)
  const patientGrowth: { month: string; patients: number }[] = last6Months.map(
    (range) => ({
      month: range.label,
      patients: monthlyPatients.filter(
        (p) =>
          p.registeredAt >= range.gte && p.registeredAt < range.lt
      ).length,
    })
  );

  const deptAppts = depts.map((d) => ({
    name: d.name,
    value: d._count.appointments,
    color: d.color,
  }));

  const statusCounts: Record<string, number> = {};
  todayAppts.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  const lowStock = medicines.filter((m) => m.stockQty <= m.reorderLevel);
  const expiringSoon = medicines.filter((m) => {
    const days = Math.floor(
      (m.expiryDate.getTime() - today.getTime()) / 86400000
    );
    return days <= 60;
  });

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
});

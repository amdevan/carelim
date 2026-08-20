import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [doctors, departments, branches, todayAppts, todayInvoices] = await Promise.all([
    db.doctor.findMany({ include: { department: true, appointments: { where: { date: { gte: startOfDay, lt: endOfDay } } } } }),
    db.department.findMany(),
    db.branch.findMany(),
    db.appointment.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
    db.invoice.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
  ]);

  const totalDoctors = doctors.length;
  const activeNow = doctors.filter(d => d.status === "active").length;
  const inConsultation = todayAppts.filter(a => a.status === "in-consult").length;
  const todayPatients = todayAppts.length;
  const todayRevenue = todayInvoices.reduce((s, i) => s + i.paid, 0);

  // Department-wise doctor count
  const deptStats = departments.map(d => ({
    name: d.name,
    color: d.color,
    count: doctors.filter(doc => doc.departmentId === d.id).length,
  })).filter(d => d.count > 0);

  // Doctor performance (top 8 by appointment count this month)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const doctorsWithAppts = await Promise.all(
    doctors.map(async d => {
      const monthAppts = await db.appointment.count({ where: { doctorId: d.id, date: { gte: startOfMonth } } });
      const completedAppts = await db.appointment.count({ where: { doctorId: d.id, date: { gte: startOfMonth }, status: "completed" } });
      return {
        id: d.id, name: d.name, specialization: d.specialization, rating: d.rating,
        department: d.department.name, departmentColor: d.department.color,
        consultationFee: d.consultationFee, status: d.status,
        monthAppts, completedAppts,
        revenue: monthAppts * d.consultationFee,
      };
    })
  );
  const topPerformers = doctorsWithAppts.sort((a, b) => b.monthAppts - a.monthAppts).slice(0, 8);

  // Status distribution
  const statusDist: Record<string, number> = {};
  doctors.forEach(d => { statusDist[d.status] = (statusDist[d.status] || 0) + 1; });

  // Available now (active + has working days including today)
  const dayName = today.toLocaleDateString("en-US", { weekday: "short" });
  const availableNow = doctors.filter(d => d.status === "active" && d.workingDays.includes(dayName)).length;

  return NextResponse.json({
    kpis: {
      totalDoctors,
      activeNow,
      availableNow,
      inConsultation,
      todayPatients,
      todayRevenue,
      departments: departments.length,
      branches: branches.length,
    },
    deptStats,
    topPerformers,
    statusDist,
  });
}

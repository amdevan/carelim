import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const invoices = await db.invoice.findMany({ where: { date: { gte: startOfMonth } }, include: { patient: true } });
  const appointments = await db.appointment.findMany({ where: { date: { gte: startOfMonth } }, include: { doctor: true } });
  const doctors = await db.doctor.findMany({ include: { appointments: { where: { date: { gte: startOfMonth } } } } });
  const patients = await db.patient.findMany();

  // Revenue by type
  const revenueByType: Record<string, number> = {};
  invoices.forEach(i => { revenueByType[i.type] = (revenueByType[i.type] || 0) + i.total; });

  // Doctor performance
  const doctorPerf = doctors.map(d => ({
    name: d.name,
    patients: d.appointments.length,
    revenue: d.appointments.length * d.consultationFee,
  })).sort((a, b) => b.patients - a.patients).slice(0, 8);

  // Monthly revenue (last 6 months)
  const monthlyRevenue: { month: string; revenue: number; collection: number; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const invs = await db.invoice.findMany({ where: { date: { gte: d, lt: dn } } });
    const rev = invs.reduce((s, i) => s + i.total, 0);
    const col = invs.reduce((s, i) => s + i.paid, 0);
    monthlyRevenue.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      revenue: rev,
      collection: col,
      profit: Math.round(rev * 0.3),
    });
  }

  // Daily revenue (last 14 days)
  const dailyRevenue: { date: string; revenue: number; collection: number; due: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const invs = await db.invoice.findMany({ where: { date: { gte: ds, lt: de } } });
    dailyRevenue.push({
      date: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      revenue: invs.reduce((s, i) => s + i.total, 0),
      collection: invs.reduce((s, i) => s + i.paid, 0),
      due: invs.reduce((s, i) => s + i.due, 0),
    });
  }

  // Revenue by payment method
  const revenueByPayment: Record<string, number> = {};
  invoices.forEach(i => {
    if (i.paymentMethod) revenueByPayment[i.paymentMethod] = (revenueByPayment[i.paymentMethod] || 0) + i.paid;
  });

  return NextResponse.json({
    totalRevenue: invoices.reduce((s, i) => s + i.total, 0),
    totalCollection: invoices.reduce((s, i) => s + i.paid, 0),
    totalDue: invoices.reduce((s, i) => s + i.due, 0),
    revenueByType,
    revenueByPayment,
    doctorPerf,
    monthlyRevenue,
    dailyRevenue,
    patientCount: patients.length,
    appointmentCount: appointments.length,
  });
}

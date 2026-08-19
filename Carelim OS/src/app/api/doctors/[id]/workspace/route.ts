import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [doctor, todayAppts, todayInvoices, monthAppts, prescriptions, labOrders] = await Promise.all([
    db.doctor.findUnique({ where: { id }, include: { department: true } }),
    db.appointment.findMany({ where: { doctorId: id, date: { gte: startOfDay, lt: endOfDay } }, include: { patient: true }, orderBy: { time: "asc" } }),
    db.invoice.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } }, include: { patient: true } }),
    db.appointment.count({ where: { doctorId: id, date: { gte: startOfDay, lt: endOfDay } } }),
    db.prescription.findMany({ where: { doctorId: id }, include: { patient: true, items: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.labTest.findMany({ where: { doctorId: id }, include: { patient: true }, orderBy: { orderedAt: "desc" }, take: 5 }),
  ]);

  if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthCompleted = await db.appointment.count({ where: { doctorId: id, date: { gte: startOfMonth }, status: "completed" } });
  const monthRevenue = monthCompleted * doctor.consultationFee;

  const currentPatient = todayAppts.find(a => a.status === "in-consult");
  const waitingCount = todayAppts.filter(a => a.status === "scheduled" || a.status === "checked-in").length;
  const completedCount = todayAppts.filter(a => a.status === "completed").length;
  const todayRevenue = todayAppts.filter(a => a.status === "completed").reduce((s, a) => s + a.fee, 0);

  // Timeline (recent activities)
  const timeline: { time: string; action: string; detail: string; type: string }[] = [];
  todayAppts.slice(0, 5).forEach(a => {
    timeline.push({
      time: a.time,
      action: a.status === "completed" ? "Consultation completed" : a.status === "in-consult" ? "In consultation" : a.status === "checked-in" ? "Patient checked in" : "Appointment scheduled",
      detail: a.patient.name,
      type: a.status,
    });
  });
  prescriptions.slice(0, 3).forEach(p => {
    timeline.push({
      time: new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      action: "Prescription written",
      detail: `${p.code} · ${p.patient.name}`,
      type: "prescription",
    });
  });
  labOrders.slice(0, 3).forEach(l => {
    timeline.push({
      time: new Date(l.orderedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      action: "Lab ordered",
      detail: `${l.testName} · ${l.patient.name}`,
      type: "lab",
    });
  });
  timeline.sort((a, b) => a.time.localeCompare(b.time));

  return NextResponse.json({
    doctor,
    currentPatient: currentPatient ? { name: currentPatient.patient.name, token: currentPatient.tokenNo, patientCode: currentPatient.patient.patientCode } : null,
    waitingCount,
    completedCount,
    todayRevenue,
    monthAppts,
    monthCompleted,
    monthRevenue,
    pendingLabs: labOrders.filter(l => l.status === "pending" || l.status === "completed").length,
    todayAppointments: todayAppts.map(a => ({ id: a.id, time: a.time, patient: a.patient.name, patientCode: a.patient.patientCode, status: a.status, token: a.tokenNo })),
    timeline: timeline.slice(0, 8),
  });
}

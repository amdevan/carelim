import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get patient profile by userId
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const patient = await db.patient.findUnique({
    where: { id: user.patientId },
    include: {
      appointments: { include: { doctor: true }, orderBy: { date: "desc" }, take: 50 },
      prescriptions: { include: { doctor: true, items: true }, orderBy: { createdAt: "desc" }, take: 20 },
      invoices: { orderBy: { date: "desc" }, take: 20 },
      labTests: { orderBy: { orderedAt: "desc" }, take: 20 },
      clinicalNotes: { orderBy: { createdAt: "desc" }, take: 20 },
      labOrders: {
        include: { items: { include: { test: true } }, results: true },
        orderBy: { orderedAt: "desc" },
        take: 20,
      },
      radiologyTests: { orderBy: { orderedAt: "desc" }, take: 20 },
    },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({ ...patient, userId: user.id, userName: user.name, userEmail: user.email, userPhone: user.phone });
}

// PUT - Update patient profile
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { userId, ...patientData } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const patient = await db.patient.update({ where: { id: user.patientId }, data: patientData });
  return NextResponse.json(patient);
}

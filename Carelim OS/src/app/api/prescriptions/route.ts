import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    const prescriptions = await db.prescription.findMany({
      where,
      include: { patient: true, doctor: { include: { department: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(prescriptions);
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      items, patientId, doctorId, diagnosis, symptoms, vitals, advice, followUp,
      clinicalData,
    } = body;
    const count = await db.prescription.count();
    const prescription = await db.prescription.create({
      data: {
        code: `RX-${String(count + 1).padStart(5, "0")}`,
        patientId,
        doctorId,
        diagnosis: diagnosis || null,
        symptoms: symptoms || null,
        vitals: vitals || null,
        advice: advice || null,
        followUp: followUp || null,
        status: "active",
        clinicalData: clinicalData ? (typeof clinicalData === "string" ? clinicalData : JSON.stringify(clinicalData)) : null,
        items: {
          create: (items || []).map((it: {
            medicineName: string; dosage: string; frequency: string;
            duration: string; quantity: number; instructions?: string;
            generic?: string; strength?: string; route?: string; timing?: string; remarks?: string;
          }) => ({
            medicineName: it.medicineName,
            dosage: it.dosage,
            frequency: it.frequency,
            duration: it.duration,
            quantity: it.quantity || 1,
            instructions: it.instructions || null,
          })),
        },
      },
      include: { items: true, patient: true, doctor: true },
    });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Prescription", detail: `Created prescription ${prescription.code}` } });
    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    console.error("Error creating prescription:", error);
    return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 });
  }
}

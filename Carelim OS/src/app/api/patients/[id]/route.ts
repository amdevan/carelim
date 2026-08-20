import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        appointments: { include: { doctor: true }, orderBy: { date: "desc" }, take: 20 },
        prescriptions: { include: { doctor: true, items: true }, orderBy: { createdAt: "desc" }, take: 10 },
        invoices: { orderBy: { date: "desc" }, take: 10 },
        labTests: { orderBy: { orderedAt: "desc" }, take: 10 },
      },
    });
    if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

const ALLOWED_PATIENT_FIELDS = new Set([
  "name", "email", "phone", "gender", "dob", "age", "bloodGroup", "address", "photo",
  "bloodPressure", "temperature", "pulse", "weight", "height", "bmi",
  "allergies", "chronicConditions", "emergencyContact", "emergencyName",
  "insuranceProvider", "insuranceNumber", "status",
]);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const filteredData = Object.keys(body).reduce((acc, key) => {
      if (ALLOWED_PATIENT_FIELDS.has(key)) {
        (acc as Record<string, unknown>)[key] = body[key];
      }
      return acc;
    }, {} as Record<string, unknown>);
    const patient = await db.patient.update({ where: { id }, data: filteredData });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "UPDATE", module: "Patient", detail: `Updated patient ${patient.name}` } });
    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.patient.delete({ where: { id } });
    await db.auditLog.create({ data: { user: getAuthEmail(_req), action: "DELETE", module: "Patient", detail: "Deleted patient" } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting patient:", error);
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}

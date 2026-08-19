import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { name, email, password, phone } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }

  // Check if email already exists
  const existing = await db.patientUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  // Create a Patient record first
  const patientCount = await db.patient.count();
  const patient = await db.patient.create({
    data: {
      patientCode: `PT-${String(patientCount + 1).padStart(5, "0")}`,
      name,
      email,
      phone: phone || "",
      gender: "male",
      status: "active",
    },
  });

  // Tag patient as coming from Carelim Mobile App
  await db.patientSource.create({
    data: {
      patientId: patient.id,
      sourceType: "carelim",
      sourceName: "mobile_app",
      trackingId: `CMS-${Date.now().toString(36).toUpperCase()}`,
    },
  });

  // Create PatientUser linked to the patient
  const patientUser = await db.patientUser.create({
    data: {
      patientId: patient.id,
      name,
      email,
      password,
      phone: phone || null,
      status: "active",
    },
  });

  await db.auditLog.create({
    data: { user: email, action: "REGISTER", module: "PatientPortal", detail: `Patient registered: ${name}` },
  });

  return NextResponse.json({
    id: patientUser.id,
    patientId: patientUser.patientId,
    name: patientUser.name,
    email: patientUser.email,
    phone: patientUser.phone,
  }, { status: 201 });
}

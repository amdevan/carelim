import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const limit = Number(searchParams.get("limit") || 0);
    const branchId = searchParams.get("branchId");
    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { patientCode: { contains: q } },
        { phone: { contains: q } },
      ];
    }
    const patients = await db.patient.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });

    // Attach source info for each patient
    const patientIds = patients.map((p) => p.id);
    const sources = await db.patientSource.findMany({
      where: { patientId: { in: patientIds } },
      select: { patientId: true, sourceType: true, sourceName: true },
    });
    const sourceMap = new Map(sources.map((s) => [s.patientId, s]));
    const patientsWithSource = patients.map((p) => ({
      ...p,
      source: sourceMap.get(p.id) || null,
    }));

    return NextResponse.json(patientsWithSource);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
});

export const POST = withTenant(async (req: NextRequest) => {
  const denied = await requirePermission(req, "Patient", "create");
  if (denied) return denied;
  try {
    const body = await req.json();
    const count = await db.patient.count();
    // Only pick fields that exist on the Patient model
    const { name, email, phone, gender, dob, age, bloodGroup, address, photo,
      bloodPressure, temperature, pulse, weight, height, bmi, allergies,
      chronicConditions, emergencyContact, emergencyName, insuranceProvider,
      insuranceNumber, status, branchId } = body;
    const patient = await db.patient.create({
      data: {
        name, email: email || null, phone, gender: gender || "male",
        dob: dob ? new Date(dob) : null, age: age || 0, bloodGroup: bloodGroup || null,
        address: address || null, photo: photo || null,
        bloodPressure: bloodPressure || null, temperature: temperature || null,
        pulse: pulse || null, weight: weight || null, height: height || null,
        bmi: bmi || null, allergies: allergies || null,
        chronicConditions: chronicConditions || null,
        emergencyContact: emergencyContact || null, emergencyName: emergencyName || null,
        insuranceProvider: insuranceProvider || null, insuranceNumber: insuranceNumber || null,
        status: status || "active",
        branchId: branchId || null,
        // Use nanoid for globally unique patientCode (since @unique is global across tenants)
        patientCode: body.patientCode || `PT-${nanoid(8).toUpperCase()}`,
        registeredAt: new Date(),
      },
    });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Patient", detail: `Registered patient ${patient.name}` } });
    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
});

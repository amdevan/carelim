import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const limit = Number(searchParams.get("limit") || 0);
    const where = q ? {
      OR: [
        { name: { contains: q } },
        { patientCode: { contains: q } },
        { phone: { contains: q } },
      ]
    } : {};
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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const count = await db.patient.count();
    const patient = await db.patient.create({
      data: {
        ...body,
        patientCode: `PT-${String(count + 1).padStart(5, "0")}`,
        registeredAt: new Date(),
      },
    });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Patient", detail: `Registered patient ${patient.name}` } });
    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}

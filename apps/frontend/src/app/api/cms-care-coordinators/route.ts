import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const coordinators = await db.careCoordinator.findMany({ where, orderBy: { createdAt: "desc" } });
  // Enrich with patient names
  const patientIds = [...new Set(coordinators.map(c => c.patientId))];
  const patients = await db.patient.findMany({ where: { id: { in: patientIds } } });
  const pMap = Object.fromEntries(patients.map(p => [p.id, p]));
  return NextResponse.json(coordinators.map(c => ({
    ...c,
    patientName: pMap[c.patientId]?.name || c.patientId,
    patientCode: pMap[c.patientId]?.patientCode || "—",
    patientPhone: pMap[c.patientId]?.phone || "—",
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const c = await db.careCoordinator.create({
    data: { ...body, nextFollowup: body.nextFollowup ? new Date(body.nextFollowup) : null },
  });
  await db.auditLog.create({ data: { user: "system", action: "ASSIGN", module: "Carelim MS", detail: `Assigned coordinator ${body.coordinatorName} to patient` } });
  return NextResponse.json(c, { status: 201 });
}

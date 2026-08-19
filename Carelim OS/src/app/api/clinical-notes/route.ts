import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  const notes = await db.clinicalNote.findMany({
    where,
    include: { patient: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const note = await db.clinicalNote.create({ data: body });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "CREATE", module: "EMR", detail: "Added clinical note" } });
  return NextResponse.json(note, { status: 201 });
}

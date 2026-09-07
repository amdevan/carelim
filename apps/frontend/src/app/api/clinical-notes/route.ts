import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
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
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const note = await db.clinicalNote.create({ data: body });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "EMR", detail: "Added clinical note" } });
  return NextResponse.json(note, { status: 201 });
});

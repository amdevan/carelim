import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  const followups = await db.dentalFollowup.findMany({ where, orderBy: { scheduledDate: "asc" } });
  return NextResponse.json(followups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.dentalFollowup.count();
  const f = await db.dentalFollowup.create({
    data: {
      ...body,
      followupNo: `DFU-${String(count + 1).padStart(5, "0")}`,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
      completedDate: body.completedDate ? new Date(body.completedDate) : null,
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Scheduled follow-up ${f.followupNo} (${f.type})` } });
  return NextResponse.json(f, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const cases = await db.orthodonticCase.findMany({ where, orderBy: { startDate: "desc" } });
  return NextResponse.json(cases);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.orthodonticCase.count();
  const c = await db.orthodonticCase.create({
    data: {
      ...body,
      caseNo: `ORT-${String(count + 1).padStart(5, "0")}`,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      wireSequence: body.wireSequence ? (typeof body.wireSequence === "object" ? JSON.stringify(body.wireSequence) : body.wireSequence) : null,
      progressPhotos: body.progressPhotos ? (typeof body.progressPhotos === "object" ? JSON.stringify(body.progressPhotos) : body.progressPhotos) : null,
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created orthodontic case ${c.caseNo}` } });
  return NextResponse.json(c, { status: 201 });
}

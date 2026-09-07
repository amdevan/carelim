import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const cases = await db.orthodonticCase.findMany({ where, orderBy: { startDate: "desc" } });
  return NextResponse.json(cases);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.orthodonticCase.count();
  const c = await db.orthodonticCase.create({
    data: {
      ...body,
      caseNo: `ORT-${nanoid(8).toUpperCase()}`,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      wireSequence: body.wireSequence ? (typeof body.wireSequence === "object" ? JSON.stringify(body.wireSequence) : body.wireSequence) : null,
      progressPhotos: body.progressPhotos ? (typeof body.progressPhotos === "object" ? JSON.stringify(body.progressPhotos) : body.progressPhotos) : null,
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created orthodontic case ${c.caseNo}` } });
  return NextResponse.json(c, { status: 201 });
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const cases = await db.implantCase.findMany({ where, orderBy: { placementDate: "desc" } });
  return NextResponse.json(cases);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.implantCase.count();
  const c = await db.implantCase.create({
    data: {
      ...body,
      caseNo: `IMP-${String(count + 1).padStart(5, "0")}`,
      placementDate: body.placementDate ? new Date(body.placementDate) : new Date(),
      abutmentDate: body.abutmentDate ? new Date(body.abutmentDate) : null,
      finalCrownDate: body.finalCrownDate ? new Date(body.finalCrownDate) : null,
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created implant case ${c.caseNo} — ${c.implantBrand}` } });
  return NextResponse.json(c, { status: 201 });
}

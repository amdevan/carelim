import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const cases = await db.implantCase.findMany({ where, orderBy: { placementDate: "desc" } });
  return NextResponse.json(cases);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.implantCase.count();
  const c = await db.implantCase.create({
    data: {
      ...body,
      caseNo: `IMP-${nanoid(8).toUpperCase()}`,
      placementDate: body.placementDate ? new Date(body.placementDate) : new Date(),
      abutmentDate: body.abutmentDate ? new Date(body.abutmentDate) : null,
      finalCrownDate: body.finalCrownDate ? new Date(body.finalCrownDate) : null,
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created implant case ${c.caseNo} — ${c.implantBrand}` } });
  return NextResponse.json(c, { status: 201 });
});

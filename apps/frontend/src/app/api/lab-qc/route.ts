import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async () => {
  const qc = await db.labQualityControl.findMany({ include: { test: true }, orderBy: { performedAt: "desc" } });
  return NextResponse.json(qc);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.labQualityControl.count();
  const qc = await db.labQualityControl.create({ data: { ...body, code: `QC-${nanoid(8).toUpperCase()}`, performedAt: new Date() } });
  await db.auditLog.create({ data: { user: body.performedBy || "system", action: "CREATE", module: "LabQC", detail: `QC ${qc.code} performed` } });
  return NextResponse.json(qc, { status: 201 });
});

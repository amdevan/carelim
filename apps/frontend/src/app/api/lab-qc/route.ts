import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const qc = await db.labQualityControl.findMany({ include: { test: true }, orderBy: { performedAt: "desc" } });
  return NextResponse.json(qc);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.labQualityControl.count();
  const qc = await db.labQualityControl.create({ data: { ...body, code: `QC-${String(count + 1).padStart(5, "0")}`, performedAt: new Date() } });
  await db.auditLog.create({ data: { user: body.performedBy || "system", action: "CREATE", module: "LabQC", detail: `QC ${qc.code} performed` } });
  return NextResponse.json(qc, { status: 201 });
}

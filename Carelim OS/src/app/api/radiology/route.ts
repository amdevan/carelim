import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const tests = await db.radiologyTest.findMany({
    where,
    include: { patient: true },
    orderBy: { orderedAt: "desc" },
  });
  return NextResponse.json(tests);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.radiologyTest.count();
  const test = await db.radiologyTest.create({
    data: { ...body, testCode: `RAD-${String(count + 1).padStart(5, "0")}`, orderedAt: new Date() },
  });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "CREATE", module: "Radiology", detail: `Ordered ${body.modality} for patient` } });
  return NextResponse.json(test, { status: 201 });
}

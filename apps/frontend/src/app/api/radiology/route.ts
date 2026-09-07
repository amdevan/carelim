import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const branchId = searchParams.get("branchId");
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  const tests = await db.radiologyTest.findMany({
    where,
    include: { patient: true },
    orderBy: { orderedAt: "desc" },
  });
  return NextResponse.json(tests);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.radiologyTest.count();
  const test = await db.radiologyTest.create({
    data: { ...body, testCode: `RAD-${nanoid(8).toUpperCase()}`, orderedAt: new Date() },
  });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Radiology", detail: `Ordered ${body.modality} for patient` } });
  return NextResponse.json(test, { status: 201 });
});

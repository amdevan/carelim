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
  const tests = await db.labTest.findMany({
    where,
    include: { patient: true },
    orderBy: { orderedAt: "desc" },
  });
  return NextResponse.json(tests);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.labTest.count();
  const test = await db.labTest.create({
    data: { ...body, orderedAt: new Date(), testCode: `LAB-${nanoid(8).toUpperCase()}` },
  });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "LabTest", detail: `Ordered lab test ${test.testName}` } });
  return NextResponse.json(test, { status: 201 });
});

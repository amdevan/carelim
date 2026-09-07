import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const deptId = searchParams.get("departmentId");
  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { code: { contains: q } }];
  if (deptId) where.departmentId = deptId;
  const tests = await db.labTestMaster.findMany({
    where,
    include: { department: true, parameters: { include: { referenceRanges: true }, orderBy: { displayOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tests);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { parameters, ...data } = body;
  if (!data.code) {
    const count = await db.labTestMaster.count();
    data.code = `LTM-${String(count + 1).padStart(3, "0")}`;
  }
  const test = await db.labTestMaster.create({
    data: {
      ...data,
      parameters: parameters ? {
        create: parameters.map((p: { name: string; unit?: string; resultType?: string; displayOrder?: number; options?: string; referenceRanges?: { gender: string; lowNormal?: string; highNormal?: string; criticalLow?: string; criticalHigh?: string; textNormal?: string }[] }) => ({
          name: p.name,
          unit: p.unit || null,
          resultType: p.resultType || "numeric",
          displayOrder: p.displayOrder || 1,
          options: p.options || null,
          referenceRanges: p.referenceRanges ? { create: p.referenceRanges } : undefined,
        })),
      } : undefined,
    },
    include: { parameters: { include: { referenceRanges: true } } },
  });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "LabTest", detail: `Created lab test ${test.name}` } });
  return NextResponse.json(test, { status: 201 });
});

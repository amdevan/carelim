import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const odos = await db.odontogram.findMany({
    where,
    include: { teeth: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(odos);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { teeth, ...rest } = body;
  const odo = await db.odontogram.create({
    data: {
      ...rest,
      teeth: teeth ? { create: teeth } : undefined,
    },
    include: { teeth: true },
  });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Dental", detail: `Created odontogram for patient ${odo.patientId}` } });
  return NextResponse.json(odo, { status: 201 });
});

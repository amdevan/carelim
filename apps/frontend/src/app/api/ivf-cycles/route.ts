import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";
export const GET = withTenant(async () => {
  const cycles = await db.iVFCycle.findMany({ include: { follicularRecords: { orderBy: { monitoringDate: "desc" }, take: 1 }, embryoRecords: true, transfers: true, pregnancy: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(cycles);
});
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.iVFCycle.count();
  const cycle = await db.iVFCycle.create({ data: { ...body, cycleNo: `IVF-${nanoid(8).toUpperCase()}`, startDate: body.startDate ? new Date(body.startDate) : new Date() } });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "IVF", detail: `Created cycle ${cycle.cycleNo}` } });
  return NextResponse.json(cycle, { status: 201 });
});

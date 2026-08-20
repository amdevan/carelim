import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const cycles = await db.iVFCycle.findMany({ include: { follicularRecords: { orderBy: { monitoringDate: "desc" }, take: 1 }, embryoRecords: true, transfers: true, pregnancy: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(cycles);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.iVFCycle.count();
  const cycle = await db.iVFCycle.create({ data: { ...body, cycleNo: `IVF-${String(count + 1).padStart(5, "0")}`, startDate: body.startDate ? new Date(body.startDate) : new Date() } });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "IVF", detail: `Created cycle ${cycle.cycleNo}` } });
  return NextResponse.json(cycle, { status: 201 });
}

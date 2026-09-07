import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => {
  const schedules = await db.radiologySchedule.findMany({ orderBy: { scheduledDate: "asc" } });
  return NextResponse.json(schedules);
});
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const sched = await db.radiologySchedule.create({ data: { ...body, scheduledDate: new Date(body.scheduledDate) } });
  return NextResponse.json(sched, { status: 201 });
});

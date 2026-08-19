import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const schedules = await db.radiologySchedule.findMany({ orderBy: { scheduledDate: "asc" } });
  return NextResponse.json(schedules);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sched = await db.radiologySchedule.create({ data: { ...body, scheduledDate: new Date(body.scheduledDate) } });
  return NextResponse.json(sched, { status: 201 });
}

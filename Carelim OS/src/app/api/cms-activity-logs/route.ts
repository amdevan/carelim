import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  const logs = await db.patientActivityLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const log = await db.patientActivityLog.create({ data: body });
  return NextResponse.json(log, { status: 201 });
}

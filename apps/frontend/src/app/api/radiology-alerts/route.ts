import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const alerts = await db.radiologyAlert.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(alerts);
}

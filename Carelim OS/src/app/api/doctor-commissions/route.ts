import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const commissions = await db.doctorCommission.findMany({ orderBy: { month: "desc" } });
  return NextResponse.json(commissions);
}

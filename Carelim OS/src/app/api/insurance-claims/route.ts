import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const claims = await db.insuranceClaim.findMany({ orderBy: { submittedAt: "desc" } });
  return NextResponse.json(claims);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.insuranceClaim.count();
  const claim = await db.insuranceClaim.create({
    data: { ...body, claimNo: `CLM-${String(count + 1).padStart(5, "0")}` },
  });
  return NextResponse.json(claim, { status: 201 });
}

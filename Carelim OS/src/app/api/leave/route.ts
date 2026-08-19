import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const leaves = await db.leaveRequest.findMany({ include: { staff: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(leaves);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const leave = await db.leaveRequest.create({
    data: { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
  });
  return NextResponse.json(leave, { status: 201 });
}

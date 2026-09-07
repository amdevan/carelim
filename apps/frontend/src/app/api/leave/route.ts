import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  const leaves = await db.leaveRequest.findMany({ where, include: { staff: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(leaves);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const leave = await db.leaveRequest.create({
    data: { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
  });
  return NextResponse.json(leave, { status: 201 });
});

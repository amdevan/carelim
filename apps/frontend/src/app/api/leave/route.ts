import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { buildLeaveCreateData } from "@/lib/leave";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const leaves = await db.leaveRequest.findMany({ include: { staff: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(leaves);
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
  }
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const result = await buildLeaveCreateData(body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const leave = await db.leaveRequest.create({ data: result.data });
    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    console.error("Failed to create leave request:", error);
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
  }
});

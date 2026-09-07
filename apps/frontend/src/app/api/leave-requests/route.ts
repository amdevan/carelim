import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const requests = await db.leaveRequest.findMany({
      include: { staff: { select: { id: true, firstName: true, lastName: true, department: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
}
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const request = await db.leaveRequest.create({ data: body });
    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("Failed to create leave request:", error);
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
}
});

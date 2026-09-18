import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { buildLeaveCreateData } from "@/lib/leave";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const requests = await db.leaveRequest.findMany({
      include: { staff: { select: { id: true, name: true, email: true, department: true } } },
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
    // Whitelisted payload — the CMS form sends an extra `days` field that is
    // not on the model (previously caused a Prisma "Unknown argument" 500)
    const result = await buildLeaveCreateData(body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const request = await db.leaveRequest.create({ data: result.data });
    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("Failed to create leave request:", error);
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
}
});

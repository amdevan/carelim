import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthTenantId } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get tenant audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
}
});

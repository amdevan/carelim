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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = await (db as any).tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        invoices: { orderBy: { date: "desc" }, take: 10 },
        tenantModules: { include: { module: true } },
        usageRecords: { orderBy: { date: "desc" }, take: 5 },
        supportTickets: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Get tenant subscription error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription info" },
      { status: 500 }
    );
}
});

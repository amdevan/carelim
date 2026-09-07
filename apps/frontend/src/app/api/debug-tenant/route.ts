import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/with-tenant";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { db, rawDb, getTenantId } from "@/lib/db";

export const GET = withTenant(async (req: NextRequest) => {
  const tenantId = getCurrentTenantId();
  const moduleTenantId = getTenantId();

  const filteredCount = await db.patient.count();
  const rawCount = await rawDb.patient.count();

  return NextResponse.json({
    tenantId,
    moduleTenantId,
    filteredPatientCount: filteredCount,
    rawPatientCount: rawCount,
    filteringWorks: filteredCount < rawCount || (filteredCount === 0 && rawCount > 0),
  });
});

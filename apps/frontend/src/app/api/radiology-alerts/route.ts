import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => {
  const alerts = await db.radiologyAlert.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(alerts);
});

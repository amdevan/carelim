import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(logs);
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => {
  const commissions = await db.doctorCommission.findMany({ orderBy: { month: "desc" } });
  return NextResponse.json(commissions);
});

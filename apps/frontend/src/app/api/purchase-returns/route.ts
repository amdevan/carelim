import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const returns = await db.purchaseReturn.findMany({
    include: { medicine: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(returns);
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => {
  const txns = await db.bankTransaction.findMany({ orderBy: { date: "desc" }, take: 50 });
  return NextResponse.json(txns);
});

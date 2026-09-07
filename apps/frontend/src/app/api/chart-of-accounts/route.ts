import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => {
  const accounts = await db.account.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(accounts);
});

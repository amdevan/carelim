import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => {
  const entries = await db.journalEntry.findMany({
    include: { items: { include: { account: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });
  return NextResponse.json(entries);
});

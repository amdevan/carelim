import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const entries = await db.journalEntry.findMany({
    include: { items: { include: { account: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });
  return NextResponse.json(entries);
}

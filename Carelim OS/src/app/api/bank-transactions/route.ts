import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const txns = await db.bankTransaction.findMany({ orderBy: { date: "desc" }, take: 50 });
  return NextResponse.json(txns);
}

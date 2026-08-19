import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const returns = await db.salesReturn.findMany({
    include: { medicine: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(returns);
}

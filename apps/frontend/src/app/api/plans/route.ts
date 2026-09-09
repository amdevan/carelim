import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: "asc" },
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error("plans error:", error);
    return NextResponse.json([]);
  }
}

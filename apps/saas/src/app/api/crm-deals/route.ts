import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const deals = await db.cRMDeal.findMany({
      include: { contact: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(deals);
  } catch (error) {
    console.error("crm-deals error:", error);
    return NextResponse.json([]);
  }
}

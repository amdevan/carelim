import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const campaigns = await db.campaign.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("cms-campaigns error:", error);
    return NextResponse.json([]);
  }
}

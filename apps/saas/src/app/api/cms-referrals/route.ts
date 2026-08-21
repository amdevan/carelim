import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const referrals = await db.referral.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(referrals);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}

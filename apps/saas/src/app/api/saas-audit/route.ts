import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const logs = await db.saaSAuditLog.findMany({
      include: { tenant: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("saas-audit error:", error);
    return NextResponse.json([]);
  }
}

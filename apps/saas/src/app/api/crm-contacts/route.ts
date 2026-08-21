import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const contacts = await db.cRMContact.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("crm-contacts error:", error);
    return NextResponse.json([]);
  }
}

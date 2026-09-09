import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { getAuthTenantId } from "@/lib/auth";

// GET — fetch public bookings for the admin view
export async function GET(req: NextRequest) {
  try {
    const tenantId = getAuthTenantId(req);

    // Try with tenantId filter first; fall back if column missing on production
    try {
      const where = tenantId ? { tenantId } : {};
      const bookings = await db.publicBooking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json(bookings);
    } catch (innerError: any) {
      // If tenantId column doesn't exist on production DB, query without it
      if (innerError?.message?.includes("tenantId")) {
        const bookings = await db.publicBooking.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        return NextResponse.json(bookings);
      }
      throw innerError;
    }
  } catch (error) {
    console.error("Failed to fetch public bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { rawDb } from "@/lib/db";

/**
 * Public endpoint: look up a patient by phone number for the booking flow.
 * Returns name/email so the booking form can auto-fill.
 * Scoped to the tenant resolved from the booking link — prevents
 * cross-tenant patient enumeration.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const tenantId = searchParams.get("tenant");
    if (!phone || phone.length < 5 || !tenantId) {
      return NextResponse.json({ found: false });
    }

    // Exact phone match, scoped to the tenant whose booking page is in use
    const patient = await rawDb.patient.findFirst({
      where: { phone, tenantId },
      select: { name: true, email: true, phone: true },
    });

    if (!patient) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, patient });
  } catch (error) {
    console.error("Patient lookup error:", error);
    return NextResponse.json({ found: false });
  }
}

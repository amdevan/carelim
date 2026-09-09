import { NextRequest, NextResponse } from "next/server";
import { rawDb } from "@/lib/db";

/**
 * Public endpoint: look up a patient by phone number.
 * Returns name/email if found, so the booking form can auto-fill.
 * No auth required — this is a public booking flow.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    if (!phone || phone.length < 5) {
      return NextResponse.json({ found: false });
    }

    // Search by exact phone match
    const patient = await rawDb.patient.findFirst({
      where: { phone },
      select: { id: true, name: true, email: true, phone: true },
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

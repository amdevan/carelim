import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let settings = await db.clinicSettings.findUnique({
      where: { tenantId: id },
    });
    if (!settings) {
      settings = {
        id: "",
        tenantId: id,
        clinicName: "",
        clinicEmail: "",
        clinicPhone: "",
        clinicWebsite: "",
        clinicLogo: null,
        address: "",
        city: "",
        state: "",
        country: "Nepal",
        zipCode: "",
        timezone: "Asia/Kathmandu",
        currency: "NPR",
        currencySymbol: "रू",
        locale: "en",
        dateFormat: "YYYY-MM-DD",
        timeFormat: "24h",
        fiscalYearStart: "01-01",
        taxRate: 0,
        taxEnabled: false,
        appointmentSlot: 15,
        maxAppointments: 50,
        autoReminder: true,
        reminderHours: 24,
        smsEnabled: false,
        emailEnabled: true,
        whatsappEnabled: false,
        logo: null,
        primaryColor: "#0d9488",
        secondaryColor: "#10b981",
        footerText: "",
        termsAndCond: "",
        privacyPolicy: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.clinicSettings.findUnique({
      where: { tenantId: id },
    });

    let settings;
    if (existing) {
      settings = await db.clinicSettings.update({
        where: { tenantId: id },
        data: body,
      });
    } else {
      settings = await db.clinicSettings.create({
        data: {
          ...body,
          tenantId: id,
        },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

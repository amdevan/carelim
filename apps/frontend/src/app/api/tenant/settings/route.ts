import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, getAuthTenantId } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      // No tenant context (e.g., super admin) — return defaults
      return NextResponse.json({
        clinicName: "",
        clinicEmail: "info@carelim.health",
        clinicPhone: "",
        address: "",
        city: "",
        country: "Nepal",
        timezone: "Asia/Kathmandu",
        locale: "en",
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let settings = await (db as any).clinicSettings.findUnique({
      where: { tenantId },
    });
    if (!settings) {
      settings = await (db as any).clinicSettings.create({
        data: { tenantId },
      });
    }
    return NextResponse.json({ ...settings, logoUrl: settings.logo ?? null });
  } catch (error) {
    console.error("Get tenant settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant settings" },
      { status: 500 }
    );
}
});

export const PUT = withTenant(async (req: NextRequest) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const body = await req.json();

    // Field whitelist + UI-key → model-field mapping.
    // The settings UI sends keys like email/phone/logoUrl/termsAndConditions,
    // which do not exist on ClinicSettings — passing the raw body to Prisma
    // failed with "Unknown argument" errors. Also prevents mass assignment.
    const data: Record<string, unknown> = {};
    const pick = (source: unknown, target: string) => {
      if (source !== undefined && source !== null) data[target] = source;
    };
    pick(body.clinicName, "clinicName");
    pick(body.address, "address");
    pick(body.city, "city");
    pick(body.state, "state");
    pick(body.country, "country");
    pick(body.zipCode, "zipCode");
    pick(body.timezone, "timezone");
    pick(body.currency, "currency");
    pick(body.currencySymbol, "currencySymbol");
    pick(body.locale, "locale");
    pick(body.dateFormat, "dateFormat");
    pick(body.timeFormat, "timeFormat");
    pick(body.fiscalYearStart, "fiscalYearStart");
    if (typeof body.taxRate === "number") pick(body.taxRate, "taxRate");
    if (typeof body.taxEnabled === "boolean") pick(body.taxEnabled, "taxEnabled");
    if (typeof body.appointmentSlot === "number") pick(body.appointmentSlot, "appointmentSlot");
    if (typeof body.maxAppointments === "number") pick(body.maxAppointments, "maxAppointments");
    if (typeof body.autoReminder === "boolean") pick(body.autoReminder, "autoReminder");
    if (typeof body.reminderHours === "number") pick(body.reminderHours, "reminderHours");
    if (typeof body.smsEnabled === "boolean") pick(body.smsEnabled, "smsEnabled");
    if (typeof body.emailEnabled === "boolean") pick(body.emailEnabled, "emailEnabled");
    if (typeof body.whatsappEnabled === "boolean") pick(body.whatsappEnabled, "whatsappEnabled");
    pick(body.primaryColor, "primaryColor");
    pick(body.secondaryColor, "secondaryColor");
    pick(body.footerText, "footerText");
    pick(body.privacyPolicy, "privacyPolicy");
    // UI aliases → model fields
    pick(body.email, "clinicEmail");
    pick(body.phone, "clinicPhone");
    pick(body.website, "clinicWebsite");
    pick(body.logoUrl, "logo");
    pick(body.termsAndConditions, "termsAndCond");
    // Model-native aliases
    pick(body.clinicEmail, "clinicEmail");
    pick(body.clinicPhone, "clinicPhone");
    pick(body.clinicWebsite, "clinicWebsite");
    pick(body.clinicLogo, "clinicLogo");
    pick(body.termsAndCond, "termsAndCond");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let settings = await (db as any).clinicSettings.findUnique({
      where: { tenantId },
    });
    if (!settings) {
      settings = await (db as any).clinicSettings.create({
        data: { tenantId, ...data },
      });
    } else {
      settings = await (db as any).clinicSettings.update({
        where: { tenantId },
        data,
      });
    }

    await db.auditLog.create({
      data: {
        user: getAuthEmail(req),
        action: "UPDATE",
        module: "Settings",
        detail: "Updated clinic settings",
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update tenant settings error:", error);
    return NextResponse.json(
      { error: "Failed to update tenant settings" },
      { status: 500 }
    );
}
});

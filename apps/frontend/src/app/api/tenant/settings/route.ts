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
    return NextResponse.json(settings);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let settings = await (db as any).clinicSettings.findUnique({
      where: { tenantId },
    });
    if (!settings) {
      settings = await (db as any).clinicSettings.create({
        data: { tenantId, ...body },
      });
    } else {
      settings = await (db as any).clinicSettings.update({
        where: { tenantId },
        data: body,
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/admin-impersonate — Create impersonation session
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await req.json();
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        tenantModules: { include: { module: true } },
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

  // Build a lookup map from module names to nav keys
  const MODULE_KEY_MAP: Record<string, string> = {
    "dashboard": "dashboard",
    "patient": "patients",
    "appointment": "appointments",
    "doctor": "doctors",
    "department": "doctors",
    "emr": "emr",
    "prescription": "emr",
    "clinical note": "clinical-notes",
    "laboratory": "laboratory",
    "lims": "laboratory",
    "radiology": "radiology",
    "ris": "radiology",
    "pharmacy": "pharmacy",
    "inventory": "inventory",
    "aims": "inventory",
    "billing": "billing",
    "invoice": "billing",
    "accounting": "accounting",
    "report": "reports",
    "insurance": "insurance",
    "claim": "insurance",
    "human": "hr",
    "hr": "hr",
    "staff": "staff",
    "leave": "leave",
    "audit": "audit",
    "setting": "settings",
    "dental": "dental",
    "ivf": "ivf",
    "fertility": "ivf",
    "telemedicine": "telemedicine",
    "telehealth": "telemedicine",
    "video": "telemedicine",
    "public": "public-booking",
    "booking": "public-booking",
    "notification": "notifications",
    "email": "notifications",
    "sms": "notifications",
    "branch": "branches",
    "branches": "branches",
  };

    // Get enabled module keys
    const enabledModules = tenant.tenantModules
      .filter((tm) => tm.enabled)
      .map((tm) => {
        const name = tm.module.name.toLowerCase();
        // Find the first matching key in the map
        for (const [keyword, navKey] of Object.entries(MODULE_KEY_MAP)) {
          if (name.includes(keyword)) return navKey;
        }
        // Fallback: convert display name to kebab-case nav key
        return tm.module.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      });

    // Log the impersonation
    await db.saaSAuditLog.create({
      data: {
        adminEmail: "admin@carelim.com",
        tenantId,
        action: "IMPERSONATE",
        module: "Tenants",
        detail: `Impersonated tenant: ${tenant.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.ownerEmail,
        plan: tenant.plan?.name || "trial",
        status: tenant.status,
        enabledModules,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to impersonate tenant" },
      { status: 500 }
    );
  }
}

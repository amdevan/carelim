import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, adminEmail } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, domain: true, status: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Log the impersonation action
    await db.saaSAuditLog.create({
      data: {
        adminEmail: adminEmail || "unknown",
        tenantId: tenant.id,
        action: "impersonate",
        module: "admin",
        detail: `Impersonating tenant: ${tenant.name}`,
      },
    });

    // Generate a temporary impersonation token (in production, use JWT)
    const impersonationToken = Buffer.from(
      JSON.stringify({ tenantId: tenant.id, exp: Date.now() + 3600000 })
    ).toString("base64");

    return NextResponse.json({
      success: true,
      tenant,
      impersonationToken,
      redirectUrl: `/${tenant.domain || tenant.id}`,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to impersonate" }, { status: 500 });
  }
}

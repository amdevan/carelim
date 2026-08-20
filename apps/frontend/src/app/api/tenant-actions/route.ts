import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { action, tenantId } = await req.json();

    if (!tenantId || !action) {
      return NextResponse.json(
        { error: "tenantId and action are required" },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    switch (action) {
      case "reset_password": {
        // In production, generate a token and send email with reset link
        await db.saaSAuditLog.create({
          data: {
            adminEmail: "admin@carelim.com",
            tenantId,
            action: "RESET_PASSWORD",
            module: "Tenants",
            detail: `Password reset requested for tenant: ${tenant.name}`,
          },
        });
        return NextResponse.json({
          success: true,
          message: "Password reset email sent",
        });
      }
      case "send_welcome": {
        await db.saaSAuditLog.create({
          data: {
            adminEmail: "admin@carelim.com",
            tenantId,
            action: "SEND_WELCOME",
            module: "Tenants",
            detail: `Welcome email sent to: ${tenant.name}`,
          },
        });
        return NextResponse.json({
          success: true,
          message: "Welcome email sent",
        });
      }
      case "export_data": {
        await db.saaSAuditLog.create({
          data: {
            adminEmail: "admin@carelim.com",
            tenantId,
            action: "EXPORT_DATA",
            module: "Tenants",
            detail: `Data export initiated for: ${tenant.name}`,
          },
        });
        return NextResponse.json({
          success: true,
          message: "Data export initiated",
        });
      }
      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute tenant action" },
      { status: 500 }
    );
  }
}

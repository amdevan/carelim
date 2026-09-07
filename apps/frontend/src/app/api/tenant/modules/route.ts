import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, getAuthTenantId } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const modules = await db.tenantModule.findMany({
      include: { module: true },
    });
    return NextResponse.json(modules);
  } catch (error) {
    console.error("Get tenant modules error:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
}
});

export const PUT = withTenant(async (req: NextRequest) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { moduleId, enabled } = body;

    if (!moduleId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "moduleId and enabled (boolean) are required" },
        { status: 400 }
      );
    }

    const existing = await db.tenantModule.findFirst({
      where: { moduleId },
    });

    if (existing) {
      await db.tenantModule.update({
        where: { id: existing.id },
        data: { enabled },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).tenantModule.create({
        data: { tenantId, moduleId, enabled },
      });
    }

    await db.auditLog.create({
      data: {
        user: getAuthEmail(req),
        action: enabled ? "ENABLE" : "DISABLE",
        module: "Modules",
        detail: `Module ${moduleId} ${enabled ? "enabled" : "disabled"}`,
      },
    });

    const modules = await db.tenantModule.findMany({
      include: { module: true },
    });
    return NextResponse.json(modules);
  } catch (error) {
    console.error("Update tenant modules error:", error);
    return NextResponse.json(
      { error: "Failed to update modules" },
      { status: 500 }
    );
}
});

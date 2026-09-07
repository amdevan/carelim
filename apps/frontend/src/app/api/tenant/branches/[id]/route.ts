import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, getAuthTenantId } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest, context) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context!.params;
    const branch = await db.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    return NextResponse.json(branch);
  } catch (error) {
    console.error("Get tenant branch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branch" },
      { status: 500 }
    );
}
});

export const PUT = withTenant(async (req: NextRequest, context) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context!.params;
    const body = await req.json();
    const branch = await db.branch.update({ where: { id }, data: body });
    return NextResponse.json(branch);
  } catch (error) {
    console.error("Update tenant branch error:", error);
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    );
}
});

export const DELETE = withTenant(async (req: NextRequest, context) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context!.params;
    await db.branch.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        user: getAuthEmail(req),
        action: "DELETE",
        module: "Branches",
        detail: "Deleted branch",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete tenant branch error:", error);
    return NextResponse.json(
      { error: "Failed to delete branch" },
      { status: 500 }
    );
}
});

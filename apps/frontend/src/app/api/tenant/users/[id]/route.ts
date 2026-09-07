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
    const user = await db.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Get tenant user error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
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
    const user = await db.user.update({
      where: { id },
      data: body,
      include: { role: true },
    });

    await db.auditLog.create({
      data: {
        user: getAuthEmail(req),
        action: "UPDATE",
        module: "Users",
        detail: `Updated user ${user.name}`,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update tenant user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
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
    await db.user.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        user: getAuthEmail(req),
        action: "DELETE",
        module: "Users",
        detail: "Deleted user",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete tenant user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
}
});

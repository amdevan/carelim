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

    const users = await db.user.findMany({
      include: { role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Get tenant users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
}
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const tenantId = getAuthTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password || "medcore123",
        phone: body.phone,
        roleId: body.roleId,
        branchId: body.branchId,
        status: body.status || "active",
      },
      include: { role: true },
    });

    await db.auditLog.create({
      data: {
        user: getAuthEmail(req),
        action: "CREATE",
        module: "Users",
        detail: `Added user ${user.name}`,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Create tenant user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
}
});

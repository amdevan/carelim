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

    const branches = await db.branch.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(branches);
  } catch (error) {
    console.error("Get tenant branches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
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
    const branch = await db.branch.create({ data: body });

    await db.auditLog.create({
      data: {
        user: getAuthEmail(req),
        action: "CREATE",
        module: "Branches",
        detail: `Added branch ${branch.name}`,
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error("Create tenant branch error:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
}
});

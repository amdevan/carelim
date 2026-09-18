import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail, getAuthTenantId } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

// Field whitelist — prevents mass assignment of ids/relations/timestamps
function pickBranchFields(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of ["name", "code", "clinicType", "address", "city", "state", "country", "zipCode", "phone", "email", "website", "timezone", "manager", "capacity", "operatingHours", "logo", "status"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (typeof body.capacity === "number") data.capacity = body.capacity;
  return data;
}

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
    const data = pickBranchFields(body);
    if (!data.name || !data.code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }
    const branch = await db.branch.create({ data: data as never });

    await db.auditLog.create({
      data: {
        user: getAuthEmail(req),
        action: "CREATE",
        module: "Branches",
        detail: `Added branch ${branch.name}`,
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A branch with this code already exists" }, { status: 409 });
    }
    console.error("Create tenant branch error:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
}
});

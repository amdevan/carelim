import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";

export const GET = withTenant(async () => {
  try {
    const roles = await db.role.findMany({
      include: { _count: { select: { users: true, permissions: true } } },
      orderBy: { name: "asc" },
    });
    const permissions = await db.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
    return NextResponse.json({ roles, permissions });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
});

export const POST = withTenant(async (req: NextRequest) => {
  const denied = await requirePermission(req, "Settings", "create");
  if (denied) return denied;
  try {
    const body = await req.json();
    const { name, description, permissions: permIds } = body;
    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }
    const role = await db.role.create({
      data: {
        name,
        description,
        permissions: { create: (permIds || []).map((id: string) => ({ permissionId: id })) },
      },
    });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Role", detail: `Created role ${name}` } });
    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
});

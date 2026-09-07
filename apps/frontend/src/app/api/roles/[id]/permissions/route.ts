import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";

export const PUT = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const denied = await requirePermission(req, "Settings", "edit");
  if (denied) return denied;

  const { id } = await params;
  const { module: mod, action, granted } = await req.json();

  // Find the permission
  const permission = await db.permission.findFirst({ where: { module: mod, action } });
  if (!permission) {
    return NextResponse.json({ error: "Permission not found" }, { status: 404 });
  }

  if (granted) {
    // Add permission to role
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: id, permissionId: permission.id } },
      create: { roleId: id, permissionId: permission.id },
      update: {},
    });
  } else {
    // Remove permission from role
    await db.rolePermission.deleteMany({ where: { roleId: id, permissionId: permission.id } });
  }

  return NextResponse.json({ ok: true });
});

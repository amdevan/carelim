import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { requirePermission } from "@/lib/api-guard";

export const DELETE = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const denied = await requirePermission(req, "Settings", "delete");
  if (denied) return denied;

  const { id } = await params;

  const role = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (role._count.users > 0) {
    return NextResponse.json({ error: `Cannot delete role "${role.name}" — ${role._count.users} user(s) are assigned to it. Reassign them first.` }, { status: 400 });
  }

  // Delete role permissions first, then the role
  await db.rolePermission.deleteMany({ where: { roleId: id } });
  await db.role.delete({ where: { id } });

  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "DELETE", module: "Role", detail: `Deleted role ${role.name}` } });
  return NextResponse.json({ ok: true });
});

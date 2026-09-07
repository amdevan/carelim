/**
 * Server-side permission enforcement for API routes.
 * Uses the x-user-role header (set by middleware from JWT) and checks against the Role table.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Get the user's permissions from the database via their roleId.
 * The roleId is embedded in the JWT and passed via x-user-role header (which contains the role name).
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user?.role) return [];
  return user.role.permissions.map((rp) => `${rp.permission.module}.${rp.permission.action}`);
}

/**
 * Check if a user has a specific permission.
 */
export function hasPermission(permissions: string[], module: string, action: string): boolean {
  if (permissions.includes("*.*")) return true;
  return permissions.includes(`${module}.${action}`);
}

/**
 * Middleware helper: require a permission for an API route.
 * Returns NextResponse with 403 if the user lacks the permission.
 * Returns null if the user has the permission (proceed with the handler).
 */
export async function requirePermission(
  req: NextRequest,
  module: string,
  action: string
): Promise<NextResponse | null> {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is super admin (type=admin bypasses permission checks)
  const userType = req.headers.get("x-user-type");
  if (userType === "admin") return null;

  const permissions = await getUserPermissions(userId);
  if (!hasPermission(permissions, module, action)) {
    return NextResponse.json(
      { error: `Forbidden: requires ${module}.${action} permission` },
      { status: 403 }
    );
  }
  return null; // allowed
}

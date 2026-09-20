/**
 * Permission enforcement — port of frontend lib/api-guard.ts.
 * Reads the user id from AsyncLocalStorage (never trust spoofable headers),
 * checks the Role table unless the caller is a super admin / Administrator.
 */
import { Request, Response, NextFunction } from "express";
import { db } from "../lib/prisma";
import { getCurrentUserId, getCurrentUserType, getCurrentUserRole } from "../lib/tenant-context";
import { fail } from "../lib/http";

export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user?.role) return [];
  return user.role.permissions.map(
    (rp: { permission: { module: string; action: string } }) =>
      `${rp.permission.module}.${rp.permission.action}`
  );
}

export function hasPermission(permissions: string[], moduleName: string, action: string): boolean {
  if (permissions.includes("*.*")) return true;
  return permissions.includes(`${moduleName}.${action}`);
}

export function requirePermission(moduleName: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = getCurrentUserId();
    if (!userId) return fail(res, 401, "Unauthorized");

    const userType = getCurrentUserType();
    const userRole = getCurrentUserRole();
    if (userType === "admin" || userRole === "Administrator" || userRole === "Super Admin") return next();

    const permissions = await getUserPermissions(userId);
    if (!hasPermission(permissions, moduleName, action)) {
      return fail(res, 403, `Forbidden: requires ${moduleName}.${action} permission`);
    }
    next();
  };
}

/**
 * Authentication middleware — the Express replacement for the frontend's
 * Next middleware + withTenant wrapper.
 *
 * `authenticate`  — verifies the JWT (Authorization header or carelim_token
 *                   cookie), runs the rest of the chain inside AsyncLocalStorage
 *                   tenant context so Prisma auto-filters. Fails closed with 401.
 * `requireSuperAdmin` — allows only type "admin" tokens (SaaS panel).
 */
import { Request, Response, NextFunction } from "express";
import { tenantStorage } from "../lib/tenant-context";
import { extractToken, verifyToken } from "../lib/auth";
import { fail } from "../lib/http";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken({ headers: req.headers as Record<string, string | undefined> });
  if (!token) return fail(res, 401, "Authentication required");

  const payload = verifyToken(token);
  if (!payload) return fail(res, 401, "Invalid or expired token");

  const branchIds = (payload as { branchIds?: string[] }).branchIds || (payload.branchId ? [payload.branchId] : []);

  tenantStorage.run(
    {
      tenantId: payload.tenantId || null,
      userId: payload.userId || null,
      userEmail: payload.email || null,
      userType: payload.type || null,
      userRole: payload.role || null,
      branchId: payload.branchId || null,
      branchIds,
    },
    () => next()
  );
}

export function requireSuperAdmin(_req: Request, res: Response, next: NextFunction) {
  if (tenantStorage.getStore()?.userType !== "admin") {
    return fail(res, 403, "Super admin access required");
  }
  next();
}

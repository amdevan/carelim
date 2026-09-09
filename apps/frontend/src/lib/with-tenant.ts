/**
 * withTenant — wraps a Next.js route handler to set up tenant context.
 *
 * Reads the JWT from the Authorization header or cookie, decodes it,
 * and stores tenantId in BOTH:
 *   1. A module-level variable (read by Prisma $use middleware)
 *   2. AsyncLocalStorage (read by any code that calls getCurrentTenantId())
 *
 * Usage:
 *   export const GET = withTenant(async (req) => { ... });
 *   export const POST = withTenant(async (req) => { ... });
 */
import { NextRequest, NextResponse } from "next/server";
import { tenantStorage } from "./tenant-context";
import { verifyToken } from "./auth";
import { setTenantId } from "./db";

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const token = req.cookies.get("carelim_token")?.value;
  if (token) return token;
  return null;
}

// Generic wrapper that preserves the original handler's type signature
export function withTenant<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return ((...args: any[]) => {
    const [req] = args;
    // First try middleware-set headers (fast path)
    let tenantId = req.headers?.get?.("x-tenant-id") || null;
    let userId = req.headers?.get?.("x-user-id") || null;
    let userType = req.headers?.get?.("x-user-type") || null;
    let branchId = req.headers?.get?.("x-branch-id") || null;
    let branchIds: string[] = [];
    const branchIdsHeader = req.headers?.get?.("x-branch-ids");
    if (branchIdsHeader) {
      try { branchIds = JSON.parse(branchIdsHeader); } catch { branchIds = []; }
    }

    // If headers not set by middleware, decode JWT directly (reliable fallback)
    if (!tenantId && !userId) {
      const token = getTokenFromRequest(req);
      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          tenantId = payload.tenantId || null;
          userId = payload.userId || null;
          userType = payload.type || null;
          branchId = payload.branchId || null;
          branchIds = (payload as any).branchIds || (payload.branchId ? [payload.branchId] : []);
        }
      }
    }

    // Set module-level tenantId for Prisma $use middleware
    setTenantId(tenantId);

    // Run the handler within AsyncLocalStorage context
    // (also sets module-level tenantId so Prisma middleware can read it)
    return tenantStorage.run(
      { tenantId, userId, userType, branchId, branchIds },
      async () => {
        try {
          return await handler(...args);
        } finally {
          // Clear tenantId after request completes
          setTenantId(null);
        }
      }
    );
  }) as T;
}

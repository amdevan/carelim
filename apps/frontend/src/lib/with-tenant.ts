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

    // ALWAYS decode the signed JWT — never trust client-suppliable headers
    // like x-tenant-id/x-user-id, which a caller could spoof.
    let tenantId: string | null = null;
    let userId: string | null = null;
    let userType: string | null = null;
    let branchId: string | null = null;
    let branchIds: string[] = [];
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

    // Fail closed: middleware guarantees a valid token, but if we somehow
    // cannot verify one here, do NOT run handlers with unfiltered db access.
    if (!tenantId && !userId) {
      return Promise.resolve(
        NextResponse.json({ error: "Authentication required" }, { status: 401 })
      ) as Promise<NextResponse>;
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
        } catch (error) {
          // Log server-side, return a generic 500 without leaking internals
          console.error(`[${req.method || "REQUEST"} ${req.nextUrl?.pathname || ""}]`, error);
          return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
          );
        } finally {
          // Clear tenantId after request completes
          setTenantId(null);
        }
      }
    ) as Promise<NextResponse>;
  }) as T;
}

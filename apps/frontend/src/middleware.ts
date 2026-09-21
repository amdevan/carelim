import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  // Fail fast — an empty secret would make every token verification fail silently
  throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be set in environment");
}

async function verifyTokenEdge(token: string): Promise<{ userId: string; email: string; role: string; type: string; tenantId?: string; branchId?: string; branchIds?: string[] } | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: (payload.userId as string) || "",
      email: (payload.email as string) || "",
      role: (payload.role as string) || "",
      type: (payload.type as string) || "user",
      tenantId: (payload.tenantId as string) || undefined,
      branchId: (payload.branchId as string) || undefined,
      branchIds: (payload.branchIds as string[]) || undefined,
    };
  } catch {
    return null;
  }
}

// Domain → module path mapping
// Each Carelim panel is accessible via its own subdomain.
const DOMAIN_ROUTES: Record<string, string> = {
  "dental.carelim.health": "/dental",
  "ivf.carelim.health": "/ivf",
  "rx.carelim.health": "/prescription",
  "patient.carelim.health": "/patient",
};

// In development, also map localhost ports
const DEV_DOMAIN_ROUTES: Record<string, string> = {
  "dental.localhost:3000": "/dental",
  "ivf.localhost:3000": "/ivf",
  "rx.localhost:3000": "/prescription",
  "patient.localhost:3000": "/patient",
};

// Panel pages that must only be reachable from their own domain/subdomain.
// /admin (SaaS super-admin), /doctor and /carelim-ms use env-configured
// domains (ADMIN_HOST / DOCTOR_HOST / MS_HOST); /dental /ivf /prescription
// /patient use the DOMAIN_ROUTES mapping above. Accessing them from any
// other host redirects to the panel's own URL (or the app home).
const RESTRICTED_PANELS = ["/admin", "/doctor", "/carelim-ms", "/dental", "/ivf", "/prescription", "/patient"];

function isAllowedPanelHost(panel: string, bareHost: string, fullHost: string): boolean {
  const envHost = panel === "/admin" ? process.env.ADMIN_HOST
    : panel === "/doctor" ? process.env.DOCTOR_HOST
    : panel === "/carelim-ms" ? process.env.MS_HOST
    : undefined;
  if (envHost) {
    const envBare = envHost.toLowerCase().split(":")[0];
    if (bareHost === envBare || fullHost === envHost.toLowerCase()) return true;
  }
  for (const [host, route] of Object.entries(DOMAIN_ROUTES)) {
    if ((route === panel || route.startsWith(panel + "/")) && host.split(":")[0] === bareHost) return true;
  }
  for (const [host, route] of Object.entries(DEV_DOMAIN_ROUTES)) {
    if ((route === panel || route.startsWith(panel + "/")) && host === fullHost) return true;
  }
  return false;
}

function panelOwnUrl(panel: string): string | null {
  const envHost = panel === "/admin" ? process.env.ADMIN_HOST
    : panel === "/doctor" ? process.env.DOCTOR_HOST
    : panel === "/carelim-ms" ? process.env.MS_HOST
    : undefined;
  if (envHost) return `https://${envHost}`;
  for (const [host, route] of Object.entries(DOMAIN_ROUTES)) {
    if (route === panel || route.startsWith(panel + "/")) return `https://${host}`;
  }
  return null;
}

// API routes that are public (no auth required)
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/admin-auth",
  "/api/doctor-auth",
  "/api/onboarding",
  "/api/public/booking",
  "/api/public/patient-lookup",
  "/api/public-booking",
  "/api/public-bookings",
  "/api/patient/auth",
  "/api/staff-auth",
];

// Method-specific public access (everything else on these routes requires auth)
const PUBLIC_METHOD_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  // Uploaded files (logos) — public read; IDs are unguessable cuids
  { method: "GET", pattern: /^\/api\/files\/[^/]+$/ },
  // Public booking flow reads a single branch's public info
  { method: "GET", pattern: /^\/api\/branches\/[^/]+$/ },
  // SaaS pricing is public (plan management requires auth)
  { method: "GET", pattern: /^\/api\/plans\/?$/ },
];

function isProtectedApiRoute(pathname: string, method: string): boolean {
  // Method-specific public exceptions first
  for (const { method: m, pattern } of PUBLIC_METHOD_ROUTES) {
    if (method === m && pattern.test(pathname)) return false;
  }
  // Explicit public routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return false;
  }
  // Default-deny: every other /api route requires authentication
  return true;
}

// Platform-admin routes: require a super_admin role claim (not just any valid JWT)
const SUPER_ADMIN_PREFIXES = [
  "/api/tenants",
  "/api/admin-users",
  "/api/admin-impersonate",
  "/api/tenant-actions",
  "/api/saas-dashboard",
  "/api/saas-invoices",
  "/api/saas-audit",
  "/api/saas-settings",
  "/api/saas-modules",
  "/api/add-ons",
  "/api/support-tickets",
];

function requiresSuperAdmin(pathname: string, method: string): boolean {
  if (SUPER_ADMIN_PREFIXES.some((route) => pathname.startsWith(route))) return true;
  return false;
}

function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check cookie
  const token = request.cookies.get("carelim_token")?.value;
  if (token) return token;

  return null;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl;
  const pathname = url.pathname;

  // --- Security Headers (applied to all responses) ---
  const securityHeaders: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
  };

  // HSTS only in production
  if (process.env.NODE_ENV === "production") {
    securityHeaders["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }

  // --- API Auth Protection ---
  if (pathname.startsWith("/api/")) {
    if (isProtectedApiRoute(pathname, request.method)) {
      const token = getTokenFromRequest(request);

      if (!token) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const payload = await verifyTokenEdge(token);
      if (!payload) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }

      // Platform-admin authorization: only super_admins may touch these routes
      if (requiresSuperAdmin(pathname, request.method) && payload.role !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden: super admin access required" },
          { status: 403 }
        );
      }

      // Add user info to request headers for downstream handlers
      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.userId);
      response.headers.set("x-user-email", payload.email);
      response.headers.set("x-user-role", payload.role);
      response.headers.set("x-user-type", payload.type);
      if (payload.tenantId) {
        response.headers.set("x-tenant-id", payload.tenantId);
      }
      if (payload.branchId) {
        response.headers.set("x-branch-id", payload.branchId);
      }
      if (payload.branchIds) {
        response.headers.set("x-branch-ids", JSON.stringify(payload.branchIds));
      }

      // Apply security headers
      for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value);
      }

      return response;
    }

    // For public API routes, still apply security headers
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // --- Page Routes: Panels only reachable from their own domain ---
  const firstSeg = "/" + (pathname.split("/")[1] || "");
  if (RESTRICTED_PANELS.includes(firstSeg)) {
    const fullHost = hostname.toLowerCase();
    const bareHost = fullHost.split(":")[0];
    const devOverride =
      process.env.NODE_ENV !== "production" &&
      (bareHost === "localhost" || bareHost === "127.0.0.1" || bareHost.endsWith(".localhost"));
    if (!devOverride && !isAllowedPanelHost(firstSeg, bareHost, fullHost)) {
      return NextResponse.redirect(panelOwnUrl(firstSeg) || new URL("/", request.url));
    }
  }

  // --- Page Routes: Subdomain Rewriting ---
  // Helper: prefix the module path, but never double-prefix a path that is
  // already the module's own path (e.g. /dental on dental.<domain>).
  const applyRoutePath = (routePath: string) => {
    url.pathname = url.pathname === "/" || url.pathname === routePath || url.pathname.startsWith(routePath + "/")
      ? url.pathname === "/" ? routePath : url.pathname
      : `${routePath}${url.pathname}`;
  };

  // Check production domains first
  const routePath = DOMAIN_ROUTES[hostname];
  if (routePath) {
    applyRoutePath(routePath);
    const response = NextResponse.rewrite(url);
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Check development domains
  const devRoutePath = DEV_DOMAIN_ROUTES[hostname];
  if (devRoutePath) {
    applyRoutePath(devRoutePath);
    const response = NextResponse.rewrite(url);
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Default: serve the main app (CMS) with security headers.
  // HTML documents are never cached — stale HTML referencing pruned build
  // chunks after a redeploy breaks hydration (404 chunks, dead buttons).
  // Static assets under /_next/static are excluded from the middleware
  // matcher and keep their immutable caching.
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (static images)
     */
    "/((?!_next/static|_next/image|favicon.ico|images).*)",
  ],
};

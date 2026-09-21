import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

// --- Security Headers (applied to all responses) ---
function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
  };
  // HSTS only in production
  if (process.env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }
  return headers;
}

function withSecurity(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl;
  const pathname = url.pathname;

  // --- API routes: authentication is the backend's job ---
  // The Express backend authenticates every request fail-closed (JWT via the
  // Authorization header or the carelim_token cookie, tenant context, and
  // super-admin checks). This middleware used to re-verify tokens with the
  // frontend's own JWT_SECRET — redundant, and fatal when the two apps'
  // secrets drift apart: every protected API call returned 401 even with a
  // perfectly valid session. Requests now flow straight through to the
  // backend via the /api/[...path] proxy.
  if (pathname.startsWith("/api/")) {
    return withSecurity(NextResponse.next());
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
    return withSecurity(response);
  }

  // Check development domains
  const devRoutePath = DEV_DOMAIN_ROUTES[hostname];
  if (devRoutePath) {
    applyRoutePath(devRoutePath);
    const response = NextResponse.rewrite(url);
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return withSecurity(response);
  }

  // Default: serve the main app (CMS) with security headers.
  // HTML documents are never cached — stale HTML referencing pruned build
  // chunks after a redeploy breaks hydration (404 chunks, dead buttons).
  // Static assets under /_next/static are excluded from the middleware
  // matcher and keep their immutable caching.
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return withSecurity(response);
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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Domain → module path mapping
// Each Carelim panel is accessible via its own subdomain.
const DOMAIN_ROUTES: Record<string, string> = {
  "dental.carelim.health": "/dental",
  "ivf.carelim.health": "/ivf",
  "admin.carelim.health": "/admin",
  "ms.carelim.health": "/carelim-ms",
  "rx.carelim.health": "/prescription",
  "patient.carelim.health": "/patient",
};

// In development, also map localhost ports
const DEV_DOMAIN_ROUTES: Record<string, string> = {
  "dental.localhost:3000": "/dental",
  "ivf.localhost:3000": "/ivf",
  "admin.localhost:3000": "/admin",
  "ms.localhost:3000": "/carelim-ms",
  "rx.localhost:3000": "/prescription",
  "patient.localhost:3000": "/patient",
};

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl;

  // Check production domains first
  const routePath = DOMAIN_ROUTES[hostname];
  if (routePath) {
    // Rewrite the URL to the module path while preserving query params
    url.pathname = url.pathname === "/" ? routePath : `${routePath}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Check development domains
  const devRoutePath = DEV_DOMAIN_ROUTES[hostname];
  if (devRoutePath) {
    url.pathname = url.pathname === "/" ? devRoutePath : `${devRoutePath}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Default: serve the main app (CMS)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (static images)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|images).*)",
  ],
};

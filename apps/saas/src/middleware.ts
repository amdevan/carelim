import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Subdomain → section mapping
// admin.carelim.health → /saas (SaaS admin panel)
// ms.carelim.health → /marketing (Carelim MS marketing & CRM)
const DOMAIN_ROUTES: Record<string, string> = {
  "admin.carelim.health": "/saas",
  "saas.carelim.health": "/saas",
  "ms.carelim.health": "/marketing",
  "marketing.carelim.health": "/marketing",
};

const DEV_DOMAIN_ROUTES: Record<string, string> = {
  "admin.localhost:3001": "/saas",
  "saas.localhost:3001": "/saas",
  "ms.localhost:3001": "/marketing",
  "marketing.localhost:3001": "/marketing",
};

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Check production domains
  const routePath = DOMAIN_ROUTES[hostname];
  if (routePath) {
    url.pathname = url.pathname === "/" ? routePath : `${routePath}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Check development domains
  const devRoutePath = DEV_DOMAIN_ROUTES[hostname];
  if (devRoutePath) {
    url.pathname = url.pathname === "/" ? devRoutePath : `${devRoutePath}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Default: serve root page (landing with links to both sections)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

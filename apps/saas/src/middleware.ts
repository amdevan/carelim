import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

// API routes that require authentication
const PROTECTED_API_PREFIXES = [
  "/api/tenants",
  "/api/admin-users",
  "/api/admin-impersonate",
  "/api/plans",
  "/api/add-ons",
  "/api/saas",
  "/api/support-tickets",
  "/api/tenant-actions",
  "/api/cms",
  "/api/crm",
  "/api/leads",
];

// API routes that are public (no auth required)
const PUBLIC_API_ROUTES = [
  "/api/admin-auth",
  "/api/auth/login",
];

function isProtectedApiRoute(pathname: string): boolean {
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return false;
  }
  return PROTECTED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
}

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const token = request.cookies.get("carelim_token")?.value;
  if (token) return token;
  return null;
}

async function verifyTokenEdge(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: (payload.userId as string) || "",
      email: (payload.email as string) || "",
      role: (payload.role as string) || "",
      type: (payload.type as string) || "user",
    };
  } catch {
    return null;
  }
}

// Subdomain → section mapping
// admin.carelim.health → /admin (Admin panel)
// ms.carelim.health → /marketing (Carelim MS marketing & CRM)
const DOMAIN_ROUTES: Record<string, string> = {
  "admin.carelim.health": "/admin",
  "saas.carelim.health": "/admin",
  "ms.carelim.health": "/marketing",
  "marketing.carelim.health": "/marketing",
};

const DEV_DOMAIN_ROUTES: Record<string, string> = {
  "admin.localhost:3001": "/admin",
  "saas.localhost:3001": "/admin",
  "ms.localhost:3001": "/marketing",
  "marketing.localhost:3001": "/marketing",
};

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl;
  const pathname = url.pathname;

  // --- API Auth Protection ---
  if (pathname.startsWith("/api/")) {
    if (isProtectedApiRoute(pathname)) {
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
      // Add user info to headers for downstream handlers
      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.userId);
      response.headers.set("x-user-email", payload.email);
      response.headers.set("x-user-role", payload.role);
      response.headers.set("x-user-type", payload.type);
      return response;
    }
    // Public API routes pass through
    return NextResponse.next();
  }

  // --- Page Routes: Subdomain Rewriting ---
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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// Domain → module path mapping
// Each Carelim panel is accessible via its own subdomain.
const DOMAIN_ROUTES: Record<string, string> = {
  "dental.carelim.health": "/dental",
  "ivf.carelim.health": "/ivf",
  "admin.carelim.health": "/saas",
  "saas.carelim.health": "/saas",
  "ms.carelim.health": "/marketing",
  "marketing.carelim.health": "/marketing",
  "rx.carelim.health": "/prescription",
  "patient.carelim.health": "/patient",
};

// In development, also map localhost ports
const DEV_DOMAIN_ROUTES: Record<string, string> = {
  "dental.localhost:3000": "/dental",
  "ivf.localhost:3000": "/ivf",
  "admin.localhost:3000": "/saas",
  "saas.localhost:3000": "/saas",
  "ms.localhost:3000": "/marketing",
  "marketing.localhost:3000": "/marketing",
  "rx.localhost:3000": "/prescription",
  "patient.localhost:3000": "/patient",
};

// API routes that require authentication
const PROTECTED_API_PREFIXES = [
  "/api/patients",
  "/api/doctors",
  "/api/appointments",
  "/api/prescriptions",
  "/api/invoices",
  "/api/billing",
  "/api/pharmacy",
  "/api/laboratory",
  "/api/radiology",
  "/api/hr",
  "/api/staff",
  "/api/payroll",
  "/api/leave",
  "/api/audit",
  "/api/settings",
  "/api/inventory",
  "/api/accounting",
  "/api/reports",
  "/api/branches",
  "/api/tenants",
  "/api/admin-users",
  "/api/admin-impersonate",
  "/api/dashboard",
  "/api/dental",
  "/api/ivf",
  "/api/egg-retrievals",
  "/api/embryo-transfers",
  "/api/embryos",
  "/api/cryobank",
  "/api/fertility-assessments",
  "/api/follicular-monitoring",
  "/api/pregnancy-tracking",
  "/api/semen-processing",
  "/api/ivf-cycles",
  "/api/ivf-consents",
  "/api/ivf-donors",
  "/api/ivf-packages",
  "/api/ivf-protocols",
  "/api/lab",
  "/api/radiology-alerts",
  "/api/radiology-equipment",
  "/api/radiology-modalities",
  "/api/radiology-schedules",
  "/api/radiology-studies",
  "/api/medicines",
  "/api/medicine-batches",
  "/api/suppliers",
  "/api/supplier-payments",
  "/api/purchase-orders",
  "/api/purchase-returns",
  "/api/sales-returns",
  "/api/stock-audits",
  "/api/stock-movements",
  "/api/stock-transfers",
  "/api/inventory-items",
  "/api/inventory-locations",
  "/api/inventory-movements",
  "/api/patient-payments",
  "/api/doctor-commissions",
  "/api/journal-entries",
  "/api/bank-transactions",
  "/api/cash-transactions",
  "/api/chart-of-accounts",
  "/api/insurance-claims",
  "/api/clinical-notes",
  "/api/doctor-schedule",
  "/api/crm",
  "/api/cms",
  "/api/leads",
  "/api/support-tickets",
  "/api/saas",
  "/api/plans",
  "/api/add-ons",
  "/api/roles",
  "/api/tenant-actions",
];

// API routes that are public (no auth required)
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/admin-auth",
  "/api/doctor-auth",
  "/api/onboarding",
  "/api/public/booking",
  "/api/patient/auth",
];

function isProtectedApiRoute(pathname: string): boolean {
  // Check if it's a public route first
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return false;
  }
  return PROTECTED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
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

export function middleware(request: NextRequest) {
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
  };

  // HSTS only in production
  if (process.env.NODE_ENV === "production") {
    securityHeaders["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }

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

      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }

      // Add user info to request headers for downstream handlers
      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.userId);
      response.headers.set("x-user-email", payload.email);
      response.headers.set("x-user-role", payload.role);
      response.headers.set("x-user-type", payload.type);

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

  // --- Page Routes: Subdomain Rewriting ---
  // Check production domains first
  const routePath = DOMAIN_ROUTES[hostname];
  if (routePath) {
    url.pathname = url.pathname === "/" ? routePath : `${routePath}${url.pathname}`;
    const response = NextResponse.rewrite(url);
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Check development domains
  const devRoutePath = DEV_DOMAIN_ROUTES[hostname];
  if (devRoutePath) {
    url.pathname = url.pathname === "/" ? devRoutePath : `${devRoutePath}${url.pathname}`;
    const response = NextResponse.rewrite(url);
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Default: serve the main app (CMS) with security headers
  const response = NextResponse.next();
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

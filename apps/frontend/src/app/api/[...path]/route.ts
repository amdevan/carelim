import { NextRequest, NextResponse } from "next/server";

// Catch-all API proxy.
//
// The Express backend is the real API. Any /api/* request that has no local
// Next.js route handler is forwarded here to the backend. Local handlers take
// precedence over this catch-all; as endpoints migrate to the backend their
// local files are deleted and traffic flows through this proxy automatically.
const BACKEND_URL = process.env.INTERNAL_API_URL || "http://localhost:4000";

// Hop-by-hop / transport headers that must not be forwarded
const SKIP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
  // Internal middleware-injected identity headers (backend re-derives
  // identity from the verified JWT, never from headers)
  "x-user-id",
  "x-user-email",
  "x-user-role",
  "x-user-type",
  "x-tenant-id",
  "x-branch-id",
  "x-branch-ids",
]);

async function proxy(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl;
  const target = `${BACKEND_URL}${url.pathname}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!SKIP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(target, { method, headers, body, redirect: "manual" });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }

  // Pass through status + headers. Set-Cookie must be re-appended one by one
  // (comma-joining would corrupt Expires dates inside cookie values).
  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie" && !SKIP_HEADERS.has(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  });
  const setCookies =
    typeof backendRes.headers.getSetCookie === "function"
      ? backendRes.headers.getSetCookie()
      : backendRes.headers.get("set-cookie")
        ? [backendRes.headers.get("set-cookie") as string]
        : [];
  for (const cookie of setCookies) {
    resHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;

// Never cache — every request must reach the backend
export const dynamic = "force-dynamic";

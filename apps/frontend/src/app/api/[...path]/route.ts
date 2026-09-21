import { NextRequest, NextResponse } from "next/server";

// Catch-all API proxy.
//
// The Express backend is the real API. Any /api/* request that has no local
// Next.js route handler is forwarded here to the backend. Local handlers take
// precedence over this catch-all; as endpoints migrate to the backend their
// local files are deleted and traffic flows through this proxy automatically.
// Normalize common misconfigurations: trailing slash or trailing /api would
// double-prefix proxied paths (e.g. /api/api/onboarding).
const BACKEND_URL = (process.env.INTERNAL_API_URL || "http://localhost:4000")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

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
  // Stale clients (bundles built while NEXT_PUBLIC_API_URL was misconfigured)
  // send paths with the host baked in, e.g. /app.carelim.com/api/plans.
  // Strip any leading hostname-looking segments so the backend always
  // receives the clean /api/* path. API paths never start with a dotted
  // segment, so this cannot affect legitimate routes.
  const segs = url.pathname.split("/").filter(Boolean);
  let start = 0;
  while (start < segs.length && segs[start].includes(".")) start += 1;
  const cleanPath = "/" + segs.slice(start).join("/");
  const target = `${BACKEND_URL}${cleanPath}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!SKIP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  // Force identity encoding on this intra-server hop. The backend's
  // compression middleware gzips responses >=1KB when the client negotiates
  // it, and undici's fetch then decompresses transparently — but in the
  // node:22-alpine production runtime that decompressed stream can arrive
  // empty through NextResponse (observed: successful logins returned 200
  // with a zero-byte body). Identity keeps the body raw end-to-end, which
  // is proven to flow through the whole chain. Compression for real
  // browsers is Traefik/CDN territory, not this hop's job.
  headers.set("accept-encoding", "identity");

  const method = req.method.toUpperCase();
  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(target, { method, headers, body, redirect: "manual" });
  } catch {
    return NextResponse.json(
      { error: `Backend unavailable at ${BACKEND_URL} — check INTERNAL_API_URL on the frontend service` },
      { status: 502 }
    );
  }

  // The Express API always answers JSON. A non-JSON error response means the
  // URL points at the wrong service (e.g. a Next.js app returning its HTML
  // 404 page) — surface a diagnostic instead of leaking HTML to the client.
  const contentType = backendRes.headers.get("content-type") || "";
  if (backendRes.status >= 400 && !contentType.includes("application/json")) {
    const text = await backendRes.text().catch(() => "");
    const snippet = text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);
    return NextResponse.json(
      {
        error: `Internal API at ${BACKEND_URL} answered with non-JSON ${backendRes.status} — INTERNAL_API_URL points at the wrong service (it must be the Express backend container)`,
        snippet,
      },
      { status: 502 }
    );
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

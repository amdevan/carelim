// API helper for communicating with the backend on a separate domain/port

/**
 * Defensive cleanup for build-time NEXT_PUBLIC_API_URL values. Env values
 * pasted into deployment UIs sometimes arrive with shell quotes/backticks or
 * trailing slashes baked in, and a bare hostname (no scheme) silently becomes
 * a *relative* path in the browser — producing requests like
 * /app.carelim.com/api/* that depend on rescue rewrites to work at all.
 */
function sanitizeApiBase(raw: string): string {
  const v = raw.replace(/[`"'\s]/g, "").replace(/\/+$/, "");
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return v;
  // Bare hostname — assume https (public domains are served behind TLS).
  return `https://${v}`;
}

export const API_BASE_URL = sanitizeApiBase(process.env.NEXT_PUBLIC_API_URL || "");

/**
 * Browser-side normalization of a computed absolute URL:
 * - same-origin URLs collapse to a relative path (identical target, no
 *   CORS/CSP edge cases);
 * - mixed-content requests (https page → http:// URL) can never succeed and
 *   are routed through the same-origin /api proxy instead.
 */
function normalizeForBrowser(url: string, fallbackPath: string): string {
  if (typeof window === "undefined") return url;
  try {
    const u = new URL(url, window.location.href);
    if (u.origin === window.location.origin) {
      return u.pathname + u.search;
    }
    if (window.location.protocol === "https:" && u.protocol === "http:") {
      return fallbackPath;
    }
  } catch {
    return fallbackPath;
  }
  return url;
}

/**
 * Prefixes an API path with the backend base URL.
 * If NEXT_PUBLIC_API_URL is not set, returns the path as-is (same-origin).
 */
export function apiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  // If path already starts with http, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizeForBrowser(`${API_BASE_URL}${normalizedPath}`, normalizedPath);
}

function buildHeaders(init?: RequestInit, token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([k, v]) => { headers[k] = v; });
    } else {
      Object.assign(headers, init.headers);
    }
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function resolveUrl(input: string | URL | Request): string | URL | Request {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    return apiUrl(input);
  }
  return input;
}

/**
 * Wrapper around fetch that automatically prefixes API URLs with the backend base URL,
 * includes auth token from the app store, and retries once after refreshing
 * an expired access token (401).
 */
export async function fetchAPI(input: string | URL | Request, init?: RequestInit, retryCount = 0): Promise<Response> {
  // Dynamically import store to avoid circular dependency
  const { useAppStore } = await import("@/store/app-store");
  const token = useAppStore.getState().token;

  const headers = buildHeaders(init, token);
  const mergedInit: RequestInit = { ...init, headers, credentials: "include" };
  const response = await fetch(resolveUrl(input), mergedInit);

  // Access token expired — refresh it and retry once
  if (response.status === 401 && retryCount < 1) {
    const refreshRes = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json().catch(() => null);
      if (data?.token) {
        useAppStore.setState({ token: data.token });
      }
      return fetchAPI(input, init, retryCount + 1);
    }

    // Refresh failed — session is over, go to the login screen (root page)
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/";
    }
  }

  return response;
}

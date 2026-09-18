// API helper for communicating with the backend on a separate domain/port
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Prefixes an API path with the backend base URL.
 * If NEXT_PUBLIC_API_URL is not set, returns the path as-is (same-origin).
 */
export function apiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  // If path already starts with http, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
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

    // Refresh failed — session is over, redirect to login
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return response;
}

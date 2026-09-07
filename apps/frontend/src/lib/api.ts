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

/**
 * Wrapper around fetch that automatically prefixes API URLs with the backend base URL
 * and includes auth token from the app store.
 */
export async function fetchAPI(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  // Dynamically import store to avoid circular dependency
  const { useAppStore } = await import("@/store/app-store");
  const token = useAppStore.getState().token;

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

  const mergedInit: RequestInit = { ...init, headers, credentials: "include" };

  if (typeof input === 'string' && input.startsWith('/api/')) {
    return fetch(apiUrl(input), mergedInit);
  }
  if (typeof input === 'string' && input.startsWith('http')) {
    return fetch(input, mergedInit);
  }
  return fetch(input, mergedInit);
}

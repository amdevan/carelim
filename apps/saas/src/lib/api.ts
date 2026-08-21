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
 * Wrapper around fetch that automatically prefixes API URLs with the backend base URL.
 */
export async function fetchAPI(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    return fetch(apiUrl(input), init);
  }
  if (typeof input === 'string' && input.startsWith('http')) {
    return fetch(input, init);
  }
  return fetch(input, init);
}

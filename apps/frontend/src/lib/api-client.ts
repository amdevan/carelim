/**
 * API client with automatic token refresh on 401 responses.
 * Usage: import { apiFetch } from "@/lib/api-client";
 */
const MAX_RETRIES = 1;

export async function apiFetch(
  url: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> {
  const response = await fetch(url, options);

  // If 401 and we haven't retried yet, try to refresh the token
  if (response.status === 401 && retryCount < MAX_RETRIES) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      // Retry the original request with the new token
      return apiFetch(url, options, retryCount + 1);
    }

    // Refresh failed — redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}

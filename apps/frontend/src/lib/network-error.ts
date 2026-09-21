/**
 * Human-readable messages for client-side fetch failures.
 *
 * Browsers report the same failure differently — Chrome/Edge say
 * "Failed to fetch", Safari says "Load failed", Firefox says
 * "NetworkError when attempting to fetch resource." All of them mean the
 * request never reached the server (stale DNS cache, captive portal,
 * VPN/proxy, connection refused) — a device/network problem, not an app bug.
 */
export function describeNetworkError(e: unknown, timedOut: boolean): string {
  if (timedOut) {
    return "Request timed out. The server may be down — please try again.";
  }

  if (e instanceof TypeError) {
    const message = e.message || "";
    if (
      message === "Failed to fetch" ||
      message === "Load failed" ||
      message.includes("NetworkError")
    ) {
      return "Your device could not reach the server. Try a hard refresh (Ctrl+Shift+R), open a fresh tab, or switch networks (Wi-Fi ↔ mobile data) — a stale DNS cache after a DNS change is the usual cause.";
    }
    return `Network error: ${message || "unknown"}. Please try again.`;
  }

  if (e instanceof Error && e.message) return e.message;
  return "An unexpected error occurred";
}

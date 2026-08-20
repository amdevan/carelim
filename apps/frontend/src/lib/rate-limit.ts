/**
 * Simple in-memory rate limiter for API routes.
 * In production, consider using Redis-backed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
}

export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes
  login: { windowMs: 15 * 60 * 1000, max: 5 },
  // General API: 100 requests per minute
  api: { windowMs: 60 * 1000, max: 100 },
  // Strict: 20 requests per minute (for sensitive operations)
  strict: { windowMs: 60 * 1000, max: 20 },
} as const;

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, config.max - entry.count);

  if (entry.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining, resetAt: entry.resetAt };
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Apply rate limiting and return 429 response if exceeded.
 * Returns null if allowed.
 */
export function rateLimitResponse(
  request: Request,
  config: RateLimitConfig,
  keyPrefix: string = "api"
): Response | null {
  const ip = getClientIp(request);
  const { allowed, remaining, resetAt } = checkRateLimit(
    `${keyPrefix}:${ip}`,
    config
  );

  if (!allowed) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}

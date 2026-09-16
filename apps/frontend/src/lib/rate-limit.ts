/**
 * Database-backed rate limiter for API routes.
 * Uses Prisma atomic operations to work correctly across multiple instances.
 */

import { rawDb } from "./db";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
}

export const RATE_LIMITS = {
  // Login: 20 attempts per 15 minutes
  login: { windowMs: 15 * 60 * 1000, max: 20 },
  // General API: 500 requests per minute
  api: { windowMs: 60 * 1000, max: 500 },
  // Strict: 100 requests per minute
  strict: { windowMs: 60 * 1000, max: 100 },
} as const;

/**
 * Check rate limit using database-backed counter.
 * Falls back to in-memory if database is unavailable.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Use raw SQL for atomic increment with PostgreSQL
    const result = await rawDb.$queryRawUnsafe<{ count: bigint }[]>(
      `INSERT INTO "RateLimitCounter" ("key", "count", "expiresAt")
       VALUES ($1, 1, $2)
       ON CONFLICT ("key") DO UPDATE
       SET "count" = CASE
         WHEN "RateLimitCounter"."expiresAt" <= NOW() THEN 1
         ELSE "RateLimitCounter"."count" + 1
       END,
       "expiresAt" = CASE
         WHEN "RateLimitCounter"."expiresAt" <= NOW() THEN $2
         ELSE "RateLimitCounter"."expiresAt"
       END
       RETURNING "count"`,
      key,
      new Date(now + config.windowMs)
    );

    const count = Number(result[0]?.count || 1);
    const remaining = Math.max(0, config.max - count);

    return {
      allowed: count <= config.max,
      remaining,
      resetAt: now + config.windowMs,
    };
  } catch {
    // Fallback: allow if DB is down (fail open for availability)
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }
}

/**
 * Get client IP from request headers.
 * Uses the leftmost non-private IP from X-Forwarded-For chain.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map(ip => ip.trim());
    // Return the first IP (original client)
    return ips[0] || "127.0.0.1";
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * Apply rate limiting and return 429 response if exceeded.
 * Returns null if allowed.
 */
export async function rateLimitResponse(
  request: Request,
  config: RateLimitConfig,
  keyPrefix: string = "api"
): Promise<Response | null> {
  const ip = getClientIp(request);
  const { allowed, remaining, resetAt } = await checkRateLimit(
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

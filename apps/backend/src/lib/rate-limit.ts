/**
 * Database-backed rate limiter — port of frontend lib/rate-limit.ts.
 * Uses Prisma raw SQL upsert so limits are correct across instances.
 */
import { rawDb } from "./prisma";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, max: 20 },
  api: { windowMs: 60 * 1000, max: 500 },
  strict: { windowMs: 60 * 1000, max: 100 },
} as const;

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  try {
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
    return {
      allowed: count <= config.max,
      remaining: Math.max(0, config.max - count),
      resetAt: now + config.windowMs,
    };
  } catch {
    // Fail open for availability if DB is unreachable
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }
}

export function rateLimitByIp(
  req: { headers: { [k: string]: string | string[] | undefined }; ip?: string }
): string {
  const fwd = req.headers["x-forwarded-for"];
  return (typeof fwd === "string" && fwd.length > 0 ? fwd.split(",")[0].trim() : req.ip) || "127.0.0.1";
}

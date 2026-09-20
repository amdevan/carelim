/**
 * Admin auth — port of frontend /api/admin-auth (SaaS platform login).
 * Issues a type:"admin" token (the only token type accepted for
 * super-admin API routes) and sets the same HttpOnly cookie the Next
 * route set, so existing clients work unmodified.
 */
import { Request, Response } from "express";
import { rawDb } from "../lib/prisma";
import { verifyPassword, signToken } from "../lib/auth";
import { fail, wrap } from "../lib/http";
import { checkRateLimit, rateLimitByIp, RATE_LIMITS } from "../lib/rate-limit";

async function adminAuth(req: Request, res: Response) {
  const rl = await checkRateLimit(`admin-login:${rateLimitByIp(req)}`, RATE_LIMITS.login);
  if (!rl.allowed) return fail(res, 429, "Too many attempts. Try again later.");

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return fail(res, 400, "Email and password are required");
    }

    const adminUser = await rawDb.adminUser.findUnique({
      where: { email },
    });

    if (!adminUser) {
      return fail(res, 401, "Invalid email or password");
    }

    const valid = await verifyPassword(password, adminUser.password);
    if (!valid) {
      return fail(res, 401, "Invalid email or password");
    }

    if (!adminUser.isActive) {
      return fail(res, 403, "Account is deactivated");
    }

    const token = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      type: "admin",
    });

    await rawDb.adminUser.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() },
    });

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.append(
      "Set-Cookie",
      `carelim_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`
    );

    return res.json({
      token,
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
    });
  } catch (error) {
    console.error("Admin auth error:", error);
    return fail(res, 500, "Authentication failed");
  }
}

export function adminAuthHandler() {
  return wrap(adminAuth);
}

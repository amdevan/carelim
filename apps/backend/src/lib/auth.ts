/**
 * Token utilities — byte-for-byte compatible with frontend lib/auth.ts.
 * Same JWT_SECRET / NEXTAUTH_SECRET, same jsonwebtoken lib, so tokens signed
 * by either side verify on both.
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "7d";

function getSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be set");
  return secret;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: "user" | "admin" | "doctor" | "patient" | "staff";
  tenantId?: string;
  branchId?: string;
  branchIds?: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: REFRESH_TOKEN_EXPIRES });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function getBearerToken(authHeader: string | undefined): string | null {
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

/** Resolve auth token from Authorization header or carelim_token cookie. */
export function extractToken(req: { headers: Record<string, string | undefined> }): string | null {
  return (
    getBearerToken(req.headers["authorization"]) ||
    getCookieValue(req.headers["cookie"], "carelim_token")
  );
}

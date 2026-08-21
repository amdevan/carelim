import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
const JWT_EXPIRES_IN = "7d";

// Lazy getter — never throw at import time (breaks Docker builds)
function getSecret(): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be set");
  }
  return JWT_SECRET;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: "user" | "admin" | "doctor" | "patient";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie.
 */
export function extractToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/carelim_token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

/**
 * Get the authenticated user from the request.
 * Returns null if not authenticated.
 */
export function getAuthUser(request: Request): TokenPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Get the authenticated user email from request headers (set by middleware).
 * Falls back to "system@carelim.health" if not available.
 */
export function getAuthEmail(request: Request): string {
  return request.headers.get("x-user-email") || "system@carelim.health";
}

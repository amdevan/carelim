import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { rateLimitResponse, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit login attempts
  const rateLimited = rateLimitResponse(req, RATE_LIMITS.login, "login");
  if (rateLimited) return rateLimited;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "Account disabled" },
        { status: 403 }
      );
    }

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role?.name || "Administrator",
      type: "user",
    });

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await db.auditLog.create({
      data: {
        user: user.email,
        action: "LOGIN",
        module: "Auth",
        detail: "User logged in",
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name || "Administrator",
        roleId: user.roleId,
        branchId: user.branchId,
        permissions:
          user.role?.permissions.map(
            (rp) => `${rp.permission.module}.${rp.permission.action}`
          ) || [],
      },
    });

    // Set HTTP-only cookie for additional security
    response.cookies.set("carelim_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

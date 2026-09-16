import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Get refresh token from cookie
    const cookieHeader = req.headers.get("Cookie");
    const match = cookieHeader?.match(/carelim_refresh=([^;]+)/);
    const refreshToken = match?.[1];

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token required" }, { status: 401 });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    // Issue new access token (short-lived)
    const newAccessToken = signToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      tenantId: payload.tenantId,
      branchId: payload.branchId,
      branchIds: payload.branchIds,
    });

    const response = NextResponse.json({ token: newAccessToken });

    response.cookies.set("carelim_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }
}

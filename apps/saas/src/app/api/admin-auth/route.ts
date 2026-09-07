import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await db.adminUser.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate JWT token for admin
    const jwt = await import("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
    const token = jwt.default.sign(
      { userId: user.id, email: user.email, role: user.role, type: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Set HTTP-only cookie
    response.cookies.set("carelim_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("admin-auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

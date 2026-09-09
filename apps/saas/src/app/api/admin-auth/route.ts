import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check env-based credentials first (no database needed)
    const envEmail = process.env.SAAS_ADMIN_EMAIL;
    const envPassword = process.env.SAAS_ADMIN_PASSWORD;
    const envName = process.env.SAAS_ADMIN_NAME || "Super Admin";
    let userId = "env-admin";
    let userName = envName;
    let userRole = "super_admin";

    console.log("Auth debug:", { hasEnvEmail: !!envEmail, hasEnvPassword: !!envPassword, emailMatch: email === envEmail });

    if (envEmail && envPassword && email === envEmail && password === envPassword) {
      userId = "env-admin";
    } else {
      // Fall back to database lookup
      const user = await db.adminUser.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "Invalid credentials", debug: { hasEnvEmail: !!envEmail, hasEnvPassword: !!envPassword, emailMatch: email === envEmail } }, { status: 401 });
      }

      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: "Invalid credentials", debug: { hasEnvEmail: !!envEmail, hasEnvPassword: !!envPassword, emailMatch: email === envEmail } }, { status: 401 });
      }
      userId = user.id;
      userName = user.name;
      userRole = user.role;
    }

    const jwt = await import("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
    const token = jwt.default.sign(
      { userId, email, role: userRole, type: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      token,
      id: userId,
      name: userName,
      email,
      role: userRole,
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

import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const user = await db.patientUser.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.status !== "active") {
    return NextResponse.json({ error: "Account is suspended" }, { status: 403 });
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: "patient",
    type: "patient",
  });

  await db.patientUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await db.auditLog.create({
    data: { user: user.email, action: "LOGIN", module: "PatientPortal", detail: "Patient logged in", ip: req.headers.get("x-forwarded-for") || "127.0.0.1" },
  });

  const response = NextResponse.json({
    id: user.id,
    patientId: user.patientId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    token,
  });

  response.cookies.set("carelim_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}

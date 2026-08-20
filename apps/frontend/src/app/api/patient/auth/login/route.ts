import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const user = await db.patientUser.findUnique({ where: { email } });
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "Account is suspended" }, { status: 403 });
  }
  await db.patientUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await db.auditLog.create({
    data: { user: user.email, action: "LOGIN", module: "PatientPortal", detail: "Patient logged in", ip: req.headers.get("x-forwarded-for") || "127.0.0.1" },
  });
  return NextResponse.json({
    id: user.id,
    patientId: user.patientId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const user = await db.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "Account disabled" }, { status: 403 });
  }
  await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await db.auditLog.create({ data: { user: user.email, action: "LOGIN", module: "Auth", detail: "User logged in", ip: req.headers.get("x-forwarded-for") || "127.0.0.1" } });
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role?.name || "Administrator",
    roleId: user.roleId,
    branchId: user.branchId,
    permissions: user.role?.permissions.map((rp) => `${rp.permission.module}.${rp.permission.action}`) || [],
  });
}

import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const ALLOWED_ROLES = ["super_admin", "admin"];

function toPublic(u: { id: string; name: string; email: string; role: string; isActive: boolean; lastLoginAt: Date | null; createdAt: Date }) {
  const { password: _password, ...rest } = u as Record<string, unknown>;
  return rest;
}

export async function GET() {
  try {
    const users = await db.adminUser.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("[GET /api/admin-users]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = typeof body?.role === "string" && ALLOWED_ROLES.includes(body.role) ? body.role : "admin";
    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
    }
    const hashed = await hashPassword(password);
    const u = await db.adminUser.create({
      data: { name, email, password: hashed, role, isActive: body?.isActive !== false },
    });
    return NextResponse.json(toPublic(u), { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "An admin user with this email already exists" }, { status: 409 });
    }
    console.error("[POST /api/admin-users]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

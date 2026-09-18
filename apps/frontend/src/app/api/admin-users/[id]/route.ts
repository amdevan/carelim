import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const ALLOWED_ROLES = ["super_admin", "admin"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body?.email === "string" && body.email.trim()) data.email = body.email.trim().toLowerCase();
    if (typeof body?.password === "string" && body.password) data.password = await hashPassword(body.password);
    if (typeof body?.role === "string" && ALLOWED_ROLES.includes(body.role)) data.role = body.role;
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const u = await db.adminUser.update({ where: { id }, data });
    const { password: _password, ...publicUser } = u as Record<string, unknown>;
    return NextResponse.json(publicUser);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "An admin user with this email already exists" }, { status: 409 });
    }
    console.error("[PATCH /api/admin-users/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.adminUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }
    console.error("[DELETE /api/admin-users/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

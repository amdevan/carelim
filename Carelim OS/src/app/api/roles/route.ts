import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET() {
  const roles = await db.role.findMany({
    include: { _count: { select: { users: true, permissions: true } } },
    orderBy: { name: "asc" },
  });
  const permissions = await db.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
  return NextResponse.json({ roles, permissions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, permissions: permIds } = body;
  const role = await db.role.create({
    data: {
      name,
      description,
      permissions: { create: (permIds || []).map((id: string) => ({ permissionId: id })) },
    },
  });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Role", detail: `Created role ${name}` } });
  return NextResponse.json(role, { status: 201 });
}

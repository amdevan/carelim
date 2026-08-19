import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = db as any;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branches = await prisma.branch.findMany({ where: { tenantId: id }, orderBy: { name: "asc" } });
  return NextResponse.json(branches);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const branch = await prisma.branch.create({ data: { ...body, tenantId: id } });
  await db.saaSAuditLog.create({
    data: { adminEmail: "admin@carelim.com", tenantId: id, action: "CREATE", module: "Branches", detail: `Added branch: ${branch.name}` },
  });
  return NextResponse.json(branch, { status: 201 });
}

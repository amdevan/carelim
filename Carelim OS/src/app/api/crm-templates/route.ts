import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (isActive !== null && isActive !== undefined) where.isActive = isActive === "true";

  const templates = await db.emailTemplate.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const template = await db.emailTemplate.create({ data: body });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created template: ${template.name}` },
  });
  return NextResponse.json(template, { status: 201 });
}

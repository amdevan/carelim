import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const source = searchParams.get("source");
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "ignoreCase" as const } },
      { phone: { contains: search, mode: "ignoreCase" as const } },
      { email: { contains: search, mode: "ignoreCase" as const } },
      { contactNo: { contains: search, mode: "ignoreCase" as const } },
    ];
  }
  if (type) where.type = type;
  if (category) where.category = category;
  if (source) where.source = source;
  if (status) where.status = status;
  if (assignedTo) where.assignedTo = assignedTo;

  const contacts = await db.cRMContact.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(contacts);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.cRMContact.count();
  const contact = await db.cRMContact.create({
    data: { ...body, contactNo: `CON-${nanoid(8).toUpperCase()}` },
  });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created contact ${contact.contactNo} - ${contact.name}` },
  });
  return NextResponse.json(contact, { status: 201 });
});

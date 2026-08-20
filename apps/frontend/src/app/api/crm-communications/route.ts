import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const type = searchParams.get("type");
  const direction = searchParams.get("direction");
  const assignedTo = searchParams.get("assignedTo");

  const where: Record<string, unknown> = {};
  if (contactId) where.contactId = contactId;
  if (type) where.type = type;
  if (direction) where.direction = direction;
  if (assignedTo) where.assignedTo = assignedTo;

  const communications = await db.cRMCommunication.findMany({
    where,
    include: { contact: { select: { name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(communications);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const communication = await db.cRMCommunication.create({ data: body });
  await db.cRMContact.update({
    where: { id: body.contactId },
    data: { lastContactAt: new Date() },
  });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created ${body.type} communication for contact ${body.contactId}` },
  });
  return NextResponse.json(communication, { status: 201 });
}

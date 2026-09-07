import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const type = searchParams.get("type");
  const contactId = searchParams.get("contactId");
  const assignedTo = searchParams.get("assignedTo");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;
  if (contactId) where.contactId = contactId;
  if (assignedTo) where.assignedTo = assignedTo;

  const tasks = await db.cRMTask.findMany({
    where,
    include: { contact: { select: { name: true, phone: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(tasks);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const task = await db.cRMTask.create({ data: body });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created task: ${task.title}` },
  });
  return NextResponse.json(task, { status: 201 });
});

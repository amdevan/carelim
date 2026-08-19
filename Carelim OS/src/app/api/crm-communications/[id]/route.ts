import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const communication = await db.cRMCommunication.findUnique({
    where: { id },
    include: { contact: true },
  });
  if (!communication) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(communication);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const communication = await db.cRMCommunication.update({ where: { id }, data: body });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated communication ${communication.id}` },
  });
  return NextResponse.json(communication);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.cRMCommunication.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted communication ${id}` },
  });
  return NextResponse.json({ ok: true });
}

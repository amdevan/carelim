import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await db.mSLead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

// Convert lead to patient — sets status and convertedPatientId
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "completed" || body.status === "treatment_started") {
    data.convertedAt = new Date();
  }
  const lead = await db.mSLead.update({ where: { id }, data });
  await db.auditLog.create({ data: { user: "system", action: "UPDATE", module: "Carelim MS", detail: `Lead ${lead.leadNo} status → ${body.status}` } });
  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.mSLead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

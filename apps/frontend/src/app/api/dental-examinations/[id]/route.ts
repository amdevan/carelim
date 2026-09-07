import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const exam = await db.dentalExamination.findUnique({ where: { id } });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exam);
});

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.examDate) data.examDate = new Date(body.examDate);
  const exam = await db.dentalExamination.update({ where: { id }, data });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "UPDATE", module: "Dental", detail: `Updated dental examination ${exam.examNo}` } });
  return NextResponse.json(exam);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.dentalExamination.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

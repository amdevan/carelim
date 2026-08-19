import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await db.dentalExamination.findUnique({ where: { id } });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exam);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.examDate) data.examDate = new Date(body.examDate);
  const exam = await db.dentalExamination.update({ where: { id }, data });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "UPDATE", module: "Dental", detail: `Updated dental examination ${exam.examNo}` } });
  return NextResponse.json(exam);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.dentalExamination.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

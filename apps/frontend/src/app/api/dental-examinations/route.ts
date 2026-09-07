import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const exams = await db.dentalExamination.findMany({
    where,
    orderBy: { examDate: "desc" },
  });
  return NextResponse.json(exams);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.dentalExamination.count();
  const exam = await db.dentalExamination.create({
    data: {
      ...body,
      examNo: `DEX-${nanoid(8).toUpperCase()}`,
      examDate: body.examDate ? new Date(body.examDate) : new Date(),
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created dental examination ${exam.examNo}` } });
  return NextResponse.json(exam, { status: 201 });
});

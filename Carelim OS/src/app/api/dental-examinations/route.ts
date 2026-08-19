import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const exams = await db.dentalExamination.findMany({
    where,
    orderBy: { examDate: "desc" },
  });
  return NextResponse.json(exams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.dentalExamination.count();
  const exam = await db.dentalExamination.create({
    data: {
      ...body,
      examNo: `DEX-${String(count + 1).padStart(5, "0")}`,
      examDate: body.examDate ? new Date(body.examDate) : new Date(),
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created dental examination ${exam.examNo}` } });
  return NextResponse.json(exam, { status: 201 });
}

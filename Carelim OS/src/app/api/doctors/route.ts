import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const deptId = searchParams.get("departmentId");
  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { specialization: { contains: q } }, { email: { contains: q } }];
  if (deptId) where.departmentId = deptId;
  const doctors = await db.doctor.findMany({
    where,
    include: { department: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(doctors);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const doctor = await db.doctor.create({ data: body });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "CREATE", module: "Doctor", detail: `Added doctor ${doctor.name}` } });
  return NextResponse.json(doctor, { status: 201 });
}

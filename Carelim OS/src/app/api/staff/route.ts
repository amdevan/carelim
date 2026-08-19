import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [staff, departments, prescriptions] = await Promise.all([
    db.staff.findMany({ include: { attendance: { orderBy: { date: "desc" }, take: 7 }, leaveRequests: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: { name: "asc" } }),
    db.department.findMany({ include: { _count: { select: { doctors: true } } } }),
    db.prescription.findMany({ include: { patient: true, doctor: { include: { department: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return NextResponse.json({ staff, departments, prescriptions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const staff = await db.staff.create({
    data: { ...body, joinDate: body.joinDate ? new Date(body.joinDate) : new Date() },
  });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "CREATE", module: "Staff", detail: `Added employee ${staff.name}` } });
  return NextResponse.json(staff, { status: 201 });
}

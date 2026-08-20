import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET() {
  const payrolls = await db.payroll.findMany({ include: { staff: true }, orderBy: { month: "desc" } });
  return NextResponse.json(payrolls);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const payroll = await db.payroll.create({
    data: {
      ...body,
      netPay: body.basicSalary + (body.allowance || 0) - (body.deduction || 0),
    },
  });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Payroll", detail: `Created payroll for ${body.month}` } });
  return NextResponse.json(payroll, { status: 201 });
}

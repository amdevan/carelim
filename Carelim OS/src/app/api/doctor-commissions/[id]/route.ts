import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "settled") data.settledAt = new Date();
  const commission = await db.doctorCommission.update({ where: { id }, data });
  return NextResponse.json(commission);
}

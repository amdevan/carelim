import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "approved") data.approvedAt = new Date();
  if (body.status === "paid") { data.paidAt = new Date(); data.approvedAt = data.approvedAt || new Date(); }
  const claim = await db.insuranceClaim.update({ where: { id }, data });
  return NextResponse.json(claim);
}

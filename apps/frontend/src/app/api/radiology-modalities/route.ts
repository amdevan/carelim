import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => {
  const modalities = await db.radiologyModality.findMany({ include: { _count: { select: { equipment: true, studies: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(modalities);
});
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  if (!body.code) {
    const count = await db.radiologyModality.count();
    body.code = `RM-${String(count + 1).padStart(3, "0")}`;
  }
  const modality = await db.radiologyModality.create({ data: body });
  return NextResponse.json(modality, { status: 201 });
});

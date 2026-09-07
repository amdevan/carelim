import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => {
  const equip = await db.radiologyEquipment.findMany({ include: { modality: true }, orderBy: { name: "asc" } });
  return NextResponse.json(equip);
});
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  if (!body.code) {
    const count = await db.radiologyEquipment.count();
    body.code = `RE-${String(count + 1).padStart(3, "0")}`;
  }
  const equip = await db.radiologyEquipment.create({ data: body });
  return NextResponse.json(equip, { status: 201 });
});

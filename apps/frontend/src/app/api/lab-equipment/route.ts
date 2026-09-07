import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const equip = await db.labEquipment.findMany({ include: { department: true }, orderBy: { name: "asc" } });
  return NextResponse.json(equip);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  if (!body.serialNumber) {
    const count = await db.labEquipment.count();
    body.serialNumber = `EQ-${String(count + 1).padStart(4, "0")}`;
  }
  const e = await db.labEquipment.create({ data: { ...body, purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null, warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null, lastCalibration: body.lastCalibration ? new Date(body.lastCalibration) : null, nextCalibration: body.nextCalibration ? new Date(body.nextCalibration) : null } });
  return NextResponse.json(e, { status: 201 });
});

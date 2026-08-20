import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const equip = await db.labEquipment.findMany({ include: { department: true }, orderBy: { name: "asc" } });
  return NextResponse.json(equip);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const e = await db.labEquipment.create({ data: { ...body, purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null, warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null, lastCalibration: body.lastCalibration ? new Date(body.lastCalibration) : null, nextCalibration: body.nextCalibration ? new Date(body.nextCalibration) : null } });
  return NextResponse.json(e, { status: 201 });
}

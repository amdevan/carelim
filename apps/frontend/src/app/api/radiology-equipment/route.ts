import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const equip = await db.radiologyEquipment.findMany({ include: { modality: true }, orderBy: { name: "asc" } });
  return NextResponse.json(equip);
}

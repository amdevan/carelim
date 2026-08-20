import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const modalities = await db.radiologyModality.findMany({ include: { _count: { select: { equipment: true, studies: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(modalities);
}

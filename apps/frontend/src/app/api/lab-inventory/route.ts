import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const inv = await db.labInventory.findMany({ include: { supplier: true }, orderBy: { name: "asc" } });
  return NextResponse.json(inv);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.expiryDate) body.expiryDate = new Date(body.expiryDate);
  const inv = await db.labInventory.create({ data: body });
  return NextResponse.json(inv, { status: 201 });
}

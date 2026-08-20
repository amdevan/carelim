import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const locations = await db.inventoryLocation.findMany({
    include: { _count: { select: { stocks: true, transfersFrom: true, transfersTo: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const loc = await db.inventoryLocation.create({ data: body });
  return NextResponse.json(loc, { status: 201 });
}

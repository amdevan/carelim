import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.inventoryItem.findMany({
    include: { stocks: { include: { location: true } }, batches: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await db.inventoryItem.create({ data: body });
  await db.auditLog.create({ data: { user: "admin@medcore.health", action: "CREATE", module: "Inventory", detail: `Created item ${item.name}` } });
  return NextResponse.json(item, { status: 201 });
}

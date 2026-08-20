import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() { const m = await db.platformModule.findMany({ include: { _count: { select: { tenants: true } } } }); return NextResponse.json(m); }
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.id) { const u = await db.platformModule.update({ where: { id: body.id }, data: { isActive: body.isActive } }); return NextResponse.json(u); }
  const m = await db.platformModule.create({ data: body }); return NextResponse.json(m, { status: 201 });
}

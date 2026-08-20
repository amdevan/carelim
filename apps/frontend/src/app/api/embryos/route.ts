import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET(req: NextRequest) { const { searchParams } = new URL(req.url); const cycleId = searchParams.get("cycleId"); const where: Record<string, unknown> = {}; if (cycleId) where.cycleId = cycleId; const e = await db.embryo.findMany({ where, orderBy: { embryoNo: "asc" } }); return NextResponse.json(e); }
export async function POST(req: NextRequest) { const body = await req.json(); const e = await db.embryo.create({ data: body }); return NextResponse.json(e, { status: 201 }); }

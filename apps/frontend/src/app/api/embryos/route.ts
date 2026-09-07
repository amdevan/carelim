import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async (req: NextRequest) => { const { searchParams } = new URL(req.url); const cycleId = searchParams.get("cycleId"); const where: Record<string, unknown> = {}; if (cycleId) where.cycleId = cycleId; const e = await db.embryo.findMany({ where, orderBy: { embryoNo: "asc" } }); return NextResponse.json(e); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); const e = await db.embryo.create({ data: body }); return NextResponse.json(e, { status: 201 }); });

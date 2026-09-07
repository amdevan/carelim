import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async (req: NextRequest) => { const { searchParams } = new URL(req.url); const cycleId = searchParams.get("cycleId"); const where: Record<string, unknown> = {}; if (cycleId) where.cycleId = cycleId; const r = await db.follicularMonitoring.findMany({ where, orderBy: { monitoringDate: "asc" } }); return NextResponse.json(r); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); const r = await db.follicularMonitoring.create({ data: { ...body, monitoringDate: body.monitoringDate ? new Date(body.monitoringDate) : new Date() } }); return NextResponse.json(r, { status: 201 }); });

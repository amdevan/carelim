import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => { const p = await db.pregnancyFollowup.findMany({ include: { cycle: true }, orderBy: { testDate: "desc" } }); return NextResponse.json(p); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); const p = await db.pregnancyFollowup.create({ data: { ...body, testDate: body.testDate ? new Date(body.testDate) : new Date() } }); return NextResponse.json(p, { status: 201 }); });

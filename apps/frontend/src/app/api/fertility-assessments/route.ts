import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => { const a = await db.fertilityAssessment.findMany({ orderBy: { assessmentDate: "desc" } }); return NextResponse.json(a); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); const a = await db.fertilityAssessment.create({ data: { ...body, assessmentDate: body.assessmentDate ? new Date(body.assessmentDate) : new Date() } }); return NextResponse.json(a, { status: 201 }); });

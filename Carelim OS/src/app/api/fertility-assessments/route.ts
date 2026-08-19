import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const a = await db.fertilityAssessment.findMany({ orderBy: { assessmentDate: "desc" } }); return NextResponse.json(a); }
export async function POST(req: NextRequest) { const body = await req.json(); const a = await db.fertilityAssessment.create({ data: { ...body, assessmentDate: body.assessmentDate ? new Date(body.assessmentDate) : new Date() } }); return NextResponse.json(a, { status: 201 }); }

import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const p = await db.pregnancyFollowup.findMany({ include: { cycle: true }, orderBy: { testDate: "desc" } }); return NextResponse.json(p); }
export async function POST(req: NextRequest) { const body = await req.json(); const p = await db.pregnancyFollowup.create({ data: { ...body, testDate: body.testDate ? new Date(body.testDate) : new Date() } }); return NextResponse.json(p, { status: 201 }); }

import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const c = await db.iVFConsent.findMany({ orderBy: { createdAt: "desc" } }); return NextResponse.json(c); }
export async function POST(req: NextRequest) { const body = await req.json(); const count = await db.iVFConsent.count(); const c = await db.iVFConsent.create({ data: { ...body, consentNo: `CON-${String(count + 1).padStart(5, "0")}` } }); return NextResponse.json(c, { status: 201 }); }

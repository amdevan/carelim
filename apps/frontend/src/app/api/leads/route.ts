import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const l = await db.lead.findMany({ orderBy: { createdAt: "desc" } }); return NextResponse.json(l); }
export async function POST(req: NextRequest) { const body = await req.json(); const l = await db.lead.create({ data: body }); return NextResponse.json(l, { status: 201 }); }

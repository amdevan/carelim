import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() { const r = await db.eggRetrieval.findMany({ orderBy: { opuDate: "desc" } }); return NextResponse.json(r); }
export async function POST(req: NextRequest) { const body = await req.json(); const r = await db.eggRetrieval.create({ data: { ...body, opuDate: body.opuDate ? new Date(body.opuDate) : new Date() } }); return NextResponse.json(r, { status: 201 }); }

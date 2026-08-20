import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const s = await db.semenProcessing.findMany({ orderBy: { collectionDate: "desc" } }); return NextResponse.json(s); }
export async function POST(req: NextRequest) { const body = await req.json(); const s = await db.semenProcessing.create({ data: { ...body, collectionDate: body.collectionDate ? new Date(body.collectionDate) : new Date() } }); return NextResponse.json(s, { status: 201 }); }

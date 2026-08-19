import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const d = await db.donorProfile.findMany({ orderBy: { createdAt: "desc" } }); return NextResponse.json(d); }
export async function POST(req: NextRequest) { const body = await req.json(); const d = await db.donorProfile.create({ data: body }); return NextResponse.json(d, { status: 201 }); }

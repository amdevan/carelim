import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() { const t = await db.embryoTransfer.findMany({ orderBy: { transferDate: "desc" } }); return NextResponse.json(t); }
export async function POST(req: NextRequest) { const body = await req.json(); const t = await db.embryoTransfer.create({ data: { ...body, transferDate: body.transferDate ? new Date(body.transferDate) : new Date() } }); return NextResponse.json(t, { status: 201 }); }

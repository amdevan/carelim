import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const u = await db.adminUser.findMany({ orderBy: { createdAt: "desc" } }); return NextResponse.json(u); }
export async function POST(req: NextRequest) { const body = await req.json(); const u = await db.adminUser.create({ data: body }); return NextResponse.json(u, { status: 201 }); }

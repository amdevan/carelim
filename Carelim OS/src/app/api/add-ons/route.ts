import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const a = await db.addOn.findMany(); return NextResponse.json(a); }
export async function POST(req: NextRequest) { const body = await req.json(); if (body.id) { const u = await db.addOn.update({ where: { id: body.id }, data: { isActive: body.isActive } }); return NextResponse.json(u); } const a = await db.addOn.create({ data: body }); return NextResponse.json(a, { status: 201 }); }

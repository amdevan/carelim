import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const c = await db.cryobankStorage.findMany({ orderBy: { freezeDate: "desc" } }); return NextResponse.json(c); }
export async function POST(req: NextRequest) { const body = await req.json(); const count = await db.cryobankStorage.count(); const c = await db.cryobankStorage.create({ data: { ...body, barcode: `CRYO-${String(count + 1).padStart(5, "0")}`, freezeDate: body.freezeDate ? new Date(body.freezeDate) : new Date() } }); return NextResponse.json(c, { status: 201 }); }

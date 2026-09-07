import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => { const s = await db.semenProcessing.findMany({ orderBy: { collectionDate: "desc" } }); return NextResponse.json(s); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); const s = await db.semenProcessing.create({ data: { ...body, collectionDate: body.collectionDate ? new Date(body.collectionDate) : new Date() } }); return NextResponse.json(s, { status: 201 }); });

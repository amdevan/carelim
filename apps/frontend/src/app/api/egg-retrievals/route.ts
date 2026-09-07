import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => { const r = await db.eggRetrieval.findMany({ orderBy: { opuDate: "desc" } }); return NextResponse.json(r); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); const r = await db.eggRetrieval.create({ data: { ...body, opuDate: body.opuDate ? new Date(body.opuDate) : new Date() } }); return NextResponse.json(r, { status: 201 }); });

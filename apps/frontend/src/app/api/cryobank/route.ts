import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";
export const GET = withTenant(async () => { const c = await db.cryobankStorage.findMany({ orderBy: { freezeDate: "desc" } }); return NextResponse.json(c); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); const count = await db.cryobankStorage.count(); const c = await db.cryobankStorage.create({ data: { ...body, barcode: `CRYO-${nanoid(8).toUpperCase()}`, freezeDate: body.freezeDate ? new Date(body.freezeDate) : new Date() } }); return NextResponse.json(c, { status: 201 }); });

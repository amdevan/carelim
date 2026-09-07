import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";
export const GET = withTenant(async () => { const c = await db.iVFConsent.findMany({ orderBy: { createdAt: "desc" } }); return NextResponse.json(c); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); const count = await db.iVFConsent.count(); const c = await db.iVFConsent.create({ data: { ...body, consentNo: `CON-${nanoid(8).toUpperCase()}` } }); return NextResponse.json(c, { status: 201 }); });

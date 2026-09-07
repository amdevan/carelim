import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => { const d = await db.donorProfile.findMany({ orderBy: { createdAt: "desc" } }); return NextResponse.json(d); });
export const POST = withTenant(async (req: NextRequest) => { const body = await req.json(); if (!body.donorCode) { const count = await db.donorProfile.count(); body.donorCode = `DON-${String(count + 1).padStart(3, "0")}`; } const d = await db.donorProfile.create({ data: body }); return NextResponse.json(d, { status: 201 }); });

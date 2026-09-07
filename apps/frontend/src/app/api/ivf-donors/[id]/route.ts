import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { const { id } = await params; const body = await req.json(); const d = await db.donorProfile.update({ where: { id }, data: body }); return NextResponse.json(d); });
export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { const { id } = await params; await db.donorProfile.delete({ where: { id } }); return NextResponse.json({ ok: true }); });

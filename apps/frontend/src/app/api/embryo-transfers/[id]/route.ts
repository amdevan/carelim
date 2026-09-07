import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { const { id } = await params; const body = await req.json(); const t = await db.embryoTransfer.update({ where: { id }, data: body }); return NextResponse.json(t); });

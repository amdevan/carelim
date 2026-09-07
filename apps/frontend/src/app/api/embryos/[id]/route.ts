import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { const { id } = await params; const body = await req.json(); const data: Record<string, unknown> = { ...body }; if (body.frozenDate) data.frozenDate = new Date(body.frozenDate); const e = await db.embryo.update({ where: { id }, data }); return NextResponse.json(e); });

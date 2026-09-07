import { NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => { const p = await db.iVFPackage.findMany({ orderBy: { name: "asc" } }); return NextResponse.json(p); });

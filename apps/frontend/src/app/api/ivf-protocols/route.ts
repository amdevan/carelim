import { NextResponse } from "next/server"; import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
export const GET = withTenant(async () => { const p = await db.treatmentProtocol.findMany({ orderBy: { name: "asc" } }); return NextResponse.json(p); });

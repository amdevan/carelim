import { NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const l = await db.saaSAuditLog.findMany({ include: { tenant: true }, orderBy: { createdAt: "desc" }, take: 50 }); return NextResponse.json(l); }

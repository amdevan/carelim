import { NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const t = await db.supportTicket.findMany({ include: { tenant: true }, orderBy: { createdAt: "desc" } }); return NextResponse.json(t); }

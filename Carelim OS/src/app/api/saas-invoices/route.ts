import { NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const i = await db.saaSInvoice.findMany({ include: { tenant: true }, orderBy: { date: "desc" } }); return NextResponse.json(i); }

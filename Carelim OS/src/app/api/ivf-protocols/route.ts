import { NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const p = await db.treatmentProtocol.findMany({ orderBy: { name: "asc" } }); return NextResponse.json(p); }

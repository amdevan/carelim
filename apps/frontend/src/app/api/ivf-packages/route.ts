import { NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const p = await db.iVFPackage.findMany({ orderBy: { name: "asc" } }); return NextResponse.json(p); }

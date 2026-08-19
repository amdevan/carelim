import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const s = await db.setting.findMany({ where: { key: { startsWith: "carelim_" } } }); const o: Record<string, string> = {}; s.forEach(x => o[x.key] = x.value); return NextResponse.json(o); }
export async function PUT(req: NextRequest) { const body = await req.json(); for (const [k, v] of Object.entries(body)) await db.setting.upsert({ where: { key: k }, update: { value: String(v) }, create: { key: k, value: String(v) } }); return NextResponse.json({ ok: true }); }

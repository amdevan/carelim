import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET() {
  const settings = await db.setting.findMany();
  const obj: Record<string, string> = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  return NextResponse.json(obj);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await db.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
  }
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "UPDATE", module: "Settings", detail: "Updated clinic settings" } });
  return NextResponse.json({ ok: true });
}

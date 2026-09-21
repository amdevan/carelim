import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: { key: { startsWith: "carelim_" } },
    });
    const map: Record<string, string> = {};
    settings.forEach((s) => (map[s.key] = s.value));
    return NextResponse.json(map);
  } catch (error) {
    console.error("saas-settings error:", error);
    return NextResponse.json({});
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      // Setting is unique per (tenantId, key); SaaS keys are global (tenantId = null)
      const existing = await db.setting.findFirst({ where: { key, tenantId: null } });
      if (existing) {
        await db.setting.update({ where: { id: existing.id }, data: { value: String(value) } });
      } else {
        await db.setting.create({ data: { key, value: String(value) } });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

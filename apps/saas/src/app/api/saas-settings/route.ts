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
      await db.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

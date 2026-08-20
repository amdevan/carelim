import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const mod = await db.platformModule.findUnique({ where: { id } });
    if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mod);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch module" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const mod = await db.platformModule.update({ where: { id }, data: body });
    return NextResponse.json(mod);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.platformModule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 });
  }
}

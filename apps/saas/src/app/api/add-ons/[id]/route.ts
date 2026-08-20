import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const addon = await db.addOn.findUnique({ where: { id } });
    if (!addon) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(addon);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch add-on" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const addon = await db.addOn.update({ where: { id }, data: body });
    return NextResponse.json(addon);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update add-on" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.addOn.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete add-on" }, { status: 500 });
  }
}

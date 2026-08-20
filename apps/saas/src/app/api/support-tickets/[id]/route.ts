import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: { tenant: true },
    });
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch support ticket" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    if (body.status === "resolved" || body.status === "closed") {
      data.resolvedAt = new Date();
    }
    const ticket = await db.supportTicket.update({ where: { id }, data });
    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update support ticket" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.supportTicket.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete support ticket" }, { status: 500 });
  }
}

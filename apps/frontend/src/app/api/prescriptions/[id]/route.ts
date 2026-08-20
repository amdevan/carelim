import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = await db.prescription.findUnique({
      where: { id },
      include: { patient: true, doctor: { include: { department: true } }, items: true },
    });
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(p);
  } catch (error) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json({ error: "Failed to fetch prescription" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.prescription.delete({ where: { id } });
    await db.auditLog.create({ data: { user: getAuthEmail(_req), action: "DELETE", module: "Prescription", detail: "Deleted prescription" } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting prescription:", error);
    return NextResponse.json({ error: "Failed to delete prescription" }, { status: 500 });
  }
}

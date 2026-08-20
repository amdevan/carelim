import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doctor = await db.doctor.findUnique({
      where: { id },
      include: { department: true, appointments: { include: { patient: true }, orderBy: { date: "desc" }, take: 20 } },
    });
    if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doctor);
  } catch (error) {
    console.error("Error fetching doctor:", error);
    return NextResponse.json({ error: "Failed to fetch doctor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const doctor = await db.doctor.update({ where: { id }, data: body });
    return NextResponse.json(doctor);
  } catch (error) {
    console.error("Error updating doctor:", error);
    return NextResponse.json({ error: "Failed to update doctor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.doctor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting doctor:", error);
    return NextResponse.json({ error: "Failed to delete doctor" }, { status: 500 });
  }
}

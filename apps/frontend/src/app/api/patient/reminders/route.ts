import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get patient's reminders
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const reminders = await db.patientReminder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reminders);
}

// POST - Create a reminder
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, title, time, type } = body;
  if (!userId || !title || !time) return NextResponse.json({ error: "userId, title and time required" }, { status: 400 });

  const reminder = await db.patientReminder.create({
    data: { userId, title, time, type: type || "medication" },
  });
  return NextResponse.json(reminder, { status: 201 });
}

// PUT - Toggle reminder active status
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, active } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const reminder = await db.patientReminder.update({ where: { id }, data: { active } });
  return NextResponse.json(reminder);
}

// DELETE - Delete a reminder
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.patientReminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

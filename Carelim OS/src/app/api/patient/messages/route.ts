import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get patient's messages
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const messages = await db.patientMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(messages);
}

// POST - Send a message
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, message, toName } = body;
  if (!userId || !message) return NextResponse.json({ error: "userId and message required" }, { status: 400 });

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  const msg = await db.patientMessage.create({
    data: {
      userId,
      fromName: user?.name || "Patient",
      fromType: "patient",
      message,
      read: false,
    },
  });

  // Auto-reply from system
  await db.patientMessage.create({
    data: {
      userId,
      fromName: toName || "Carelim Health",
      fromType: "provider",
      message: "Thank you for your message. A healthcare provider will respond shortly.",
      read: false,
    },
  });

  return NextResponse.json(msg, { status: 201 });
}

// PUT - Mark messages as read
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await db.patientMessage.updateMany({ where: { userId, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}

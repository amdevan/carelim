import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

// GET - Get patient's notifications
export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const notifications = await db.patientNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notifications);
});

// PUT - Mark notifications as read
export const PUT = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { userId, notificationId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (notificationId) {
    await db.patientNotification.update({ where: { id: notificationId }, data: { read: true } });
  } else {
    await db.patientNotification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }
  return NextResponse.json({ ok: true });
});

// POST - Create a notification
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { userId, title, message, type } = body;
  if (!userId || !title || !message) return NextResponse.json({ error: "userId, title and message required" }, { status: 400 });

  const notification = await db.patientNotification.create({
    data: { userId, title, message, type: type || "info" },
  });
  return NextResponse.json(notification, { status: 201 });
});

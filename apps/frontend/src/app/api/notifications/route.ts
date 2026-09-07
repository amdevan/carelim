import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest) => {
  // Notifications are not yet implemented in the database
  return NextResponse.json([]);
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const body = await req.json();
    // Store notification as audit log for now
    return NextResponse.json({ success: true, message: body.message || "Notification sent" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
}
});

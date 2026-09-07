import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest) => {
  // Notification templates are not yet implemented in the database
  return NextResponse.json([]);
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const body = await req.json();
    return NextResponse.json({ id: "template-1", ...body, createdAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
}
});

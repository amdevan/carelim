import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = await db.adminUser.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(users);
  } catch (error) {
    console.error("admin-users error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await db.adminUser.create({ data: body });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create admin user" }, { status: 500 });
  }
}

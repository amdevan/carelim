import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const addons = await db.addOn.findMany();
    return NextResponse.json(addons);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch add-ons" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.id) {
      const updated = await db.addOn.update({
        where: { id: body.id },
        data: { isActive: body.isActive },
      });
      return NextResponse.json(updated);
    }
    const addon = await db.addOn.create({ data: body });
    return NextResponse.json(addon, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create add-on" }, { status: 500 });
  }
}

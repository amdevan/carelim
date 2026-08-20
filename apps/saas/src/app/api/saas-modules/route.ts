import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const modules = await db.platformModule.findMany({
      include: { _count: { select: { tenants: true } } },
    });
    return NextResponse.json(modules);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.id) {
      const updated = await db.platformModule.update({
        where: { id: body.id },
        data: { isActive: body.isActive },
      });
      return NextResponse.json(updated);
    }
    const mod = await db.platformModule.create({ data: body });
    return NextResponse.json(mod, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}

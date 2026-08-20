import { NextResponse } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const modules = await prisma.platformModule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(modules);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const module = await prisma.platformModule.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price ?? 0,
        category: body.category,
        icon: body.icon,
      },
    });
    return NextResponse.json(module, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}

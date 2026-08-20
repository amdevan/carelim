import { NextResponse } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const addOns = await prisma.addOn.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(addOns);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch add-ons" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const addOn = await prisma.addOn.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(addOn, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create add-on" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@carelim/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const addOn = await prisma.addOn.findUnique({
      where: { id },
    });
    if (!addOn) {
      return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
    }
    return NextResponse.json(addOn);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch add-on" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const addOn = await prisma.addOn.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        isActive: body.isActive,
      },
    });
    return NextResponse.json(addOn);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update add-on" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.addOn.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete add-on" }, { status: 500 });
  }
}

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const contacts = await prisma.cRMContact.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contact = await prisma.cRMContact.create({ data: body });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}

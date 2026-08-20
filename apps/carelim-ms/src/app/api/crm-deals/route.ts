import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const deals = await prisma.cRMDeal.findMany({
      include: { contact: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(deals);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const deal = await prisma.cRMDeal.create({ data: body });
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}

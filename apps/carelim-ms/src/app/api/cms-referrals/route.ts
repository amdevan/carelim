import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const referrals = await prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(referrals);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const referral = await prisma.referral.create({ data: body });
    return NextResponse.json(referral, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create referral" }, { status: 500 });
  }
}

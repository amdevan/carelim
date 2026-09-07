import { NextRequest, NextResponse } from "next/server"; import { rawDb as db } from "@/lib/db";
import { nanoid } from "nanoid";
export async function GET() { const t = await db.supportTicket.findMany({ include: { tenant: true }, orderBy: { createdAt: "desc" } }); return NextResponse.json(t); }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const ticket = await db.supportTicket.create({
    data: { ...body, ticketNo: `TKT-${nanoid(8).toUpperCase()}` },
  });
  return NextResponse.json(ticket, { status: 201 });
}

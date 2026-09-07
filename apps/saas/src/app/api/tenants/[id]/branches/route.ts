import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const branches = await db.branch.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true, doctors: true, patients: true },
        },
      },
    });
    return NextResponse.json(branches);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const branch = await db.branch.create({
      data: {
        ...body,
        tenantId: id,
      },
    });
    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
  }
}

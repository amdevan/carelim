import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: { users: true, doctors: true, patients: true, staff: true },
        },
      },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    return NextResponse.json(branch);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch branch" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const body = await req.json();
    const branch = await db.branch.update({
      where: { id: branchId },
      data: body,
    });
    return NextResponse.json(branch);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update branch" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { branchId } = await params;
    await db.branch.delete({ where: { id: branchId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 });
  }
}

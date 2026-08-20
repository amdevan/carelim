import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const tasks = await prisma.cRMTask.findMany({
      include: { contact: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const task = await prisma.cRMTask.create({ data: body });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
